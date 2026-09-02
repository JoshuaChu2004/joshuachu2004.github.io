class SeatmapSidebar {
    constructor() {
        this.sidebarContainer = null;
        this.activeHandle = null;
        this.minHandle = null;
        this.maxHandle = null;
        this.isDragging = false;
        this.currentSort = 'lowest';
        this.selectedSeat = null;
        this.selectedSeats = {}; // Changed to dictionary to avoid duplicates
        this.seats = [];
        this.sortedSeats = [];
        this.filteredSeats = [];
        this.seatsDictionary = {};
        this.lockedSeats = {};
        this.isHandlingOptionClick = false; // Flag to prevent seat click during option click
        this.cartSeats = [];
        this.highlightQueue = [];

        this.loadIndex = 0;
        this.isLoading = false;

		this.userMinPrice = 99999;
		this.userMaxPrice = 0;
        this.seatMinPrice = 99999;
        this.seatMaxPrice = 0;

        // Reference to the seatmap app
        this.seatmapApp = null;

        // Mobile-specific properties
        this.isMobile = window.innerWidth <= 800;
        this.mobileToggleButton = null;
        this.isMobilePanelOpen = false;
        this.isMobilePanelDragging = false;
        this.startY = 0;
        this.currentTranslateY = 0;

        window.seatmapSidebar = this;

        // Make AddToCart globally accessible for the modal HTML
        window.AddToCart = (seatID, priceGroupDetailID) => {
            this.AddToCart(seatID, priceGroupDetailID);
        };

        this.init();
    }

    init() {
        this.sidebarContainer = document.getElementById('SeatMapSidebar');

        // Slider elements
        this.sliderTrack = document.querySelector('.SliderTrack');
        this.sliderHandles = document.querySelectorAll('.SliderHandle');
        this.minValueSpan = document.querySelector('.MinValue');
        this.maxValueSpan = document.querySelector('.MaxValue');

        // Seat list elements
        this.seatListContainer = document.getElementById('SeatListContainer');
        this.sortTabs = document.querySelectorAll('.SortTab');
        this.continueButton = document.getElementById('SidebarFootContinueButton');

        // Adjust sidebar width based on sort tabs

        // Mobile-specific element references
        this.ticketQtyWrapper = document.querySelector('.TicketQtyWrapper');
        this.multiSliderWrapper = document.querySelector('.MultiSliderWrapper');
        this.seatListSection = document.querySelector('.SeatListSection');
        this.sidebarFooter = document.querySelector('.SidebarFooter');

        this.sliderHandles.forEach(handle => {
            if (handle.dataset.type == 'min') {
                this.minHandle = handle;
            } else {
                this.maxHandle = handle;
                this.maxHandle.style.left = '100%';
            }
        });

        this.initMobileElements();
        this.setupEventListeners();
        this.populateSeatList();
        
        // Connect to the seatmap app
        this.connectToSeatmap();
        this.addExistingCartItems();
        this.adjustSidebarWidth();
    }

    initMobileElements() {
        this.isMobile = window.innerWidth <= 800;
        
        this.mobileToggleButton = document.getElementById('MobileSidebarToggle');
        this.mobileSplitButton = document.getElementById('MobileSplitButton');
        this.mobileContinuePart = document.getElementById('MobileContinuePart');
        this.mobileExpandPart = document.getElementById('MobileExpandPart');

        if (this.mobileSplitButton && this.mobileContinuePart && this.mobileExpandPart) {
            // Continue part behaves like the footer Continue button
            this.mobileContinuePart.addEventListener('click', () => {
                if (this.continueButton) {
                    // Mirror the same behavior
                    CloseSeatMap();
                    ContinueCheckout();
                }
            });

            // Arrow behaves like the original floating toggle
            this.mobileExpandPart.addEventListener('click', () => {
                this.toggleMobilePanel();
            });
        }

        if (this.mobileToggleButton) {
            this.setupMobileEventListeners();
        }
        
        // Only show it if we're actually on mobile
        if (this.isMobile) {
            this.swapToMobile();
        }

        this.updateMobileCTAVisibility();
    }

    updateMobileCTAVisibility() {
        if (!this.isMobile) {
            if (this.mobileSplitButton) this.mobileSplitButton.classList.remove('mobile');
            if (this.mobileToggleButton) this.mobileToggleButton.classList.remove('mobile');
            return;
        }

        const count = this.getSelectedSeatCount();

        // If cart has items: show split button; else show round FAB
        if (count > 0) {
            if (this.mobileSplitButton) this.mobileSplitButton.classList.add('mobile');
            if (this.mobileToggleButton) this.mobileToggleButton.classList.remove('mobile');
        } else {
            if (this.mobileSplitButton) this.mobileSplitButton.classList.remove('mobile');
            if (this.mobileToggleButton) this.mobileToggleButton.classList.add('mobile');
        }
    }
    
    populateSeatList() {
        this.seats = [];
        this.seatsDictionary = {};
        
        // Group seats by physical location (section + row + seat)
        const seatGroups = {};
        
        seatData.forEach(seat => {
            
            // Create a unique key for the physical seat location
            const seatKey = seat.MapDtlID;
            
            if (!seatGroups[seatKey]) {
                seatGroups[seatKey] = {
                    id: seatKey,
                    section: seat.Section,
                    row: seat.tRow,
                    seat: seat.tSeat,
                    isSelected: false,
                    names: [],
                    prices: [],
                    totals: [],
                    minPrice: -1,
                    maxPrice: -1,
                    types: [],
                    priceGroupDetailIDs: [],
                    ticketTypeIDs: [],
                    chosenPriceGroupDetailID: -1,
                    chosenTicketTypeID: -1,
                    selectedPriceIsTicketTypeID: false,
                    seatID: -1,
                    mapDtlID: -1,
                    defaultPrice: -1,
                    checkedPrices: false
                };
            }
            
            // Add this price option to the seat group
            seatGroups[seatKey].prices.push(seat.Price);
            seatGroups[seatKey].totals.push(seat.Total);
            seatGroups[seatKey].types.push(seat.Type);
            seatGroups[seatKey].priceGroupDetailIDs.push(seat.PriceGroupDetailID);
            seatGroups[seatKey].ticketTypeIDs.push(seat.TicketTypeID);
            seatGroups[seatKey].seatID = seat.SeatID;
            seatGroups[seatKey].mapDtlID = seat.MapDtlID;
            seatGroups[seatKey].names.push(seat.Name);
            seatGroups[seatKey].status = seat.Status;
            seatGroups[seatKey].seatShowAsSold = seat.SeatShowAsSold;
            seatGroups[seatKey].seatShow = seat.SeatShow;
            seatGroups[seatKey].minPrice = seat.MinPrice;
            seatGroups[seatKey].maxPrice = seat.MaxPrice;
            if (seat.IsDefault) {
                seatGroups[seatKey].defaultPrice = seatGroups[seatKey].prices.length - 1;
            }
        });

        this.seatsDictionary = seatGroups;
        
        // Convert grouped seats to array
        this.seats = Object.values(seatGroups);

        // Sort seats based on current sort option
        this.sortedSeats = [...this.seats].sort((a, b) => {
            if (this.currentSort === 'lowest') {
                // Sort by lowest price for each seat
                const aMinPrice = a.totals[a.defaultPrice];
                const bMinPrice = b.totals[b.defaultPrice];
                return aMinPrice - bMinPrice;
            } else {
                // Compare row letters (A is closer to stage than Z)
                const aRow = a.row || '';
                const bRow = b.row || '';
                const aRowValue = aRow.charCodeAt(0) || 0; // A=65, B=66, etc.
                const bRowValue = bRow.charCodeAt(0) || 0;

                if (aRowValue !== bRowValue) {
                    return aRowValue - bRowValue; // Lower letter (A) comes first
                }

                // Then by lowest price
                const aMinPrice = a.totals[a.defaultPrice];
                const bMinPrice = b.totals[b.defaultPrice];
                return aMinPrice - bMinPrice;
            }
        });
        this.setPriceRange();
        this.updateSeatList();
    }

    updateSeatList() {
        if (!this.seats) return;

        // Filter seats based on price range
        this.filteredSeats = this.sortedSeats.filter(seat => {
            const price = seat.totals[seat.defaultPrice];
            return (price >= this.userMinPrice && price <= this.userMaxPrice && (seat.status == 'A' && !seat.seatShowAsSold && seat.seatShow));
        });
        if (this.currentSort === 'cart') {
            this.filteredSeats = Object.values(this.selectedSeats) || [];
        }

        // Only clear container if not loading more seats
        if (!this.isLoading) {
            this.seatListContainer.innerHTML = '';
        }

        let fragment;

        if (this.currentSort == 'cart') {
            fragment = this.generateCartSeats(this.filteredSeats);
            this.loadIndex++;
        } else {    
            fragment = this.generateSeats(this.filteredSeats);
        }
        
        this.seatListContainer.appendChild(fragment);
        this.updateMobileCTAVisibility();
    }

	// lazyload more seats
    loadMoreSeats() {
        // Prevent multiple simultaneous loads
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        // Increment load index and call updateSeatList again
        this.loadIndex++;
        this.updateSeatList();
        
        this.isLoading = false;
    }

	// load seats in cart
    generateCartSeats(filteredSeats) {
        const fragment = document.createDocumentFragment();
        filteredSeats.forEach(seat => {
            const seatElement = document.createElement('div');
            seatElement.className = 'SeatItem';
            seatElement.dataset.seatId = seat.mapDtlID;
            seatElement.classList.add('in-cart');

            // Check if seat has ADA accessibility
            const hasADA = seat.types && seat.types.some(type => type === "Handicap" || type === "Companion");
            const adaText = hasADA ? (seat.types.includes("Handicap") ? `♿ ${translation.txtAdaAccessible}` : `♿ ${translation.txtAdaCompanion}`) : "";
            const priceDisplay = (seat.totals[seat.selectedPrice] != undefined ? seat.totals[seat.selectedPrice] : seat.totals[0]).toFixed(2);

			// build seat details
            seatElement.innerHTML = `
                <div class="SeatItemWrapper">
                    <div class="SeatInfo">
                        <div class="SeatName Truncate">${seat.section} - ${seat.names[seat.selectedPrice]}</div>
                        <div class="SeatDetails">Row ${seat.row} - Seat ${seat.seat}</div>
                    </div>
                    <div class="SeatPriceWrapper">
                        <div class="RemoveOptions">
                            <div class="SeatRemoveButton" aria-label="Remove Seat">
                                <i class="fa-light fa-times"></i>
                            </div>
                        </div>
                        <div class="PriceText">${currencySymbol}${priceDisplay}</div>
                            ${hasADA ? `<div class="SeatADA">${adaText}</div>` : ''}
                    </div>
                </div>
            `;
            seatElement.addEventListener('click', () => this.selectSeat(seat, seatElement));
            
            const removeButton = seatElement.querySelector('.SeatRemoveButton');
            
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent seat selection when clicking option
                this.removeSeatFromCart(seat, false);
                this.highlightSeatOnMap(seat, seat.selectedPrice, false);
            });

            fragment.appendChild(seatElement);
        });
        return fragment;
    }

    generateSeats(filteredSeats) {
        const fragment = document.createDocumentFragment();

        filteredSeats.slice(this.loadIndex * 20, Math.min(filteredSeats.length, (this.loadIndex + 1) * 20)).forEach(seat => {
            const seatElement = document.createElement('div');
            seatElement.className = 'SeatItem';
            seatElement.dataset.seatId = seat.mapDtlID;

            // Check if seat is in cart
            const isInCart = this.isSeatInCart(seat);
            if (isInCart) {
                seatElement.classList.add('in-cart');
                seatElement.classList.add('selected');
            }

            // Create price display showing all available prices

            // Check if seat has ADA accessibility
            const hasADA = seat.types && seat.types.some(type => type === "Handicap" || type === "Companion");
            const adaText = hasADA ? (seat.types.includes("Handicap") ? `♿ ${translation.txtAdaAccessible}` : `♿ ${translation.txtAdaCompanion}`) : "";
            const priceDisplay = seat.minPrice == seat.maxPrice ? (seat.minPrice).toFixed(2) : `${(seat.minPrice).toFixed(2)} - ${currencySymbol}${(seat.maxPrice).toFixed(2)}`;

            seatElement.innerHTML = `
                <div class="SeatItemWrapper">
                    <div class="SeatInfo">
                        <div class="SeatName">${seat.section}</div>
                        <div class="SeatDetails">Row ${seat.row} - Seat ${seat.seat}</div>
                        <div class="CartIndicator">${translation.txtInCart}</div>
                    </div>
                    <div class="SeatPrice">
                        <div class="PriceText">${currencySymbol}${priceDisplay}</div>
                        ${hasADA ? `<div class="SeatADA">${adaText}</div>` : ''}
                    </div>
                </div>
            `;


            seat.seatElement = seatElement;
            seatElement.addEventListener('click', () => this.selectSeat(seat, seatElement));
            
            // Show cart indicator if seat is in cart
            if (isInCart) {
                const cartIndicator = seatElement.querySelector('.CartIndicator');
                cartIndicator.style.display = 'block';
            }
            
            fragment.appendChild(seatElement);
        });
        return fragment;
    }

    resetSeatList() {
        this.loadIndex = 0;
        this.filteredSeats = this.sortedSeats;
        this.updateSeatList();
    }

    selectSeat(seat, element) {
        if (this.isSeatLocked(seat.seatID)) {
            return;
        }
        
        // Remove previous selection and collapse any expanded seats
        if (element.classList.contains('selected')) {
            element.classList.remove('selected');
            this.selectedSeat = null;
		} else if (this.currentSort == 'cart') {
			// do nothing
        }
        else {
            // Add new selection
            element.classList.add('selected');
            this.selectedSeat = element;    
        }

        let highlight;
        // Handle cart operations
        if (this.isSeatInCart(seat) && this.currentSort != 'cart') {
            this.removeSeatFromCart(seat);
            highlight = false;
        } else if (this.isSeatInCart(seat) && this.currentSort == 'cart') {
            return;
        }
        else if (!this.isHandlingOptionClick) {
            this.showSeatPopup(seat, 0, seat.priceGroupDetailIDs[seat.selectedPrice]);
            highlight = true;
        }

        // Trigger seat selection on the map (defer to avoid blocking UI)
        requestAnimationFrame(() => {
            this.highlightSeatOnMap(seat, 0, highlight);
        });
    }

	// change seat options
    async changeSeatOption(seatID, priceGroupDetailID, mapDtlID, element, ticketTypeID = 0) {
        const seat = this.selectedSeats[mapDtlID];
        if (!seat) {
            return;
        }
        if (ticketTypeID != 0 ) {
            seat.selectedPriceIsTicketTypeID = true;
            seat.chosenTicketTypeID = ticketTypeID;
            seat.selectedPrice = seat.ticketTypeIDs.indexOf(ticketTypeID);
        } else {
            // Validate the priceGroupDetailID exists in the seat's options
            seat.selectedPriceIsTicketTypeID = false;
            seat.chosenTicketTypeID = -1;
            const priceIndex = seat.priceGroupDetailIDs.indexOf(priceGroupDetailID);
            if (priceIndex === -1) {
                return;
            }
            seat.selectedPrice = priceIndex;
        }

        // Update the price display immediately for better UX
        const priceText = element.querySelector('.PriceText');
        if (priceText && seat.totals[seat.selectedPrice] != undefined) {
            priceText.innerHTML = `${currencySymbol}${seat.totals[seat.selectedPrice].toFixed(2)}`;
        }   

        // Wait for cart change to complete
        await this.ChangeCartItem(seat, priceGroupDetailID);
    }

    async ChangeCartItem(seat, priceGroupDetailID) {
        await this.removeSeatFromCart(seat, false);
        await this.addSeatToCart(seat, seat.selectedPrice, priceGroupDetailID, false);
    }
    showCartOptions(seat, element) {
        const existingOptions = element.querySelector('.RemoveOptions');
        if (existingOptions) {
            existingOptions.remove();
        }
        const removeContainer = document.createElement('div');
        removeContainer.className = 'RemoveOptions';
        const removeButton = document.createElement('button');
        removeButton.className = 'SeatRemoveButton';
        removeButton.innerHTML = `
            <div class="RemoveButton">X</div>
        `;
        
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent seat selection when clicking option
            this.removeSeatFromCart(seat);
            element.remove();
        });

        removeContainer.appendChild(removeButton);
        element.insertBefore(removeContainer, element.firstChild);
    }

    // load the seat price popup (using uikitmodal if there are multiple prices) - done using old code
    async showSeatPopup(seat, optionIndex, priceGroupDetailID) {
        this.lockSeat(seat.seatID);
        var seatInfo = seat.section + " - " + translation.txtRow + ": " + seat.row + ", " + translation.txtSeat + ": " + seat.seat;
        var el = "#s" + seat.mapDtlID;
        const self = this; // Capture reference to 'this' before AJAX call=
        $.ajax({
            type: "GET",
            url: "/plugin/seatmap/getprices/" + seat.mapDtlID + "?eventdateid="+uniqueEventDateID+"&s="+ sessionID +"",
            success: function (html) {
                if (html != "") {
                    // if 1 price
                    if (html.includes("Single|")) {
                        var SplitHtml = html.split("|");
                        var SeatID = SplitHtml[1];
                        var PriceDtlID = SplitHtml[2];
                        self.isHandlingOptionClick = false;
                        self.addSeatToCart(seat, optionIndex, PriceDtlID, false);
                    }else if (html.includes("Error|")) {
                        NotificationBox({message: "The ticket value exceeds the maximum price alowed for this exchange (<%=formatnumber(ExchangePrice,2)%>)"});
                    } else {
                        this.isHandlingOptionClick = true;
                        if (window.clientWidth >= 550) {
                            UikitModal("", "Html", html, seatInfo, 500, "", true, true, false, el);
                        } else {
                            UikitModal("", "Html", html, seatInfo, window.clientWidth - 50, "", true, true, false, el);
                        }
                    
                        // Add event listeners after modal opens
                        setTimeout(() => {
                            const modal = document.querySelector('#UikitModal');
                            if (modal) {

                                const closeButton = modal.querySelector('.uk-modal-close-default');
                                // Handle all ways the modal can be closed
                                const handleModalClose = () => {
                                    self.unlockSeat(seat.seatID);
                                    self.isHandlingOptionClick = false
                                };

                                const handleCloseClick = () => {
                                    handleModalClose();
                                    self.highlightSeatOnMap(seat, optionIndex, false);
                                    removeEventListeners();
                                }

                                const handleEscapeKey = (e) => {
                                    if (e.key === 'Escape') {
                                        handleModalClose();
                                        removeEventListeners();
                                        self.highlightSeatOnMap(seat, optionIndex, false);
                                    }
                                };
                                const handleOverlayClick = (e) => {
                                    if (e.target === modal) {
                                        e.preventDefault();
                                        handleModalClose();
                                        removeEventListeners();
                                        self.highlightSeatOnMap(seat, optionIndex, false);
                                    }
                                };  

                                const removeEventListeners = () => {
                                    modal.removeEventListener('click', handleOverlayClick);
                                    document.removeEventListener('keydown', handleEscapeKey);
                                    closeButton.removeEventListener('click', handleCloseClick);
                                }

                                // Listen for modal close events
                                modal.addEventListener('click', handleOverlayClick);

                                document.addEventListener('keydown', handleEscapeKey);
                                // Example: Add click handlers to buttons in the modal
                                if (closeButton) {
                                    closeButton.addEventListener('click', handleCloseClick);
                                } else {
                                    console.warn('Close button not found in modal');
                                }

                                const buttons = modal.querySelectorAll('.BtnAlloc2');
                                buttons.forEach(button => {
                                    button.addEventListener('click', (e) => {
                                        e.preventDefault();
                                        
                                        // Close the modal
                                        $('#UikitModalInfo').html('');
                                        $('#UikitModal').hide();
                                        
                                        // Handle modal close cleanup
                                        handleModalClose();
                                        removeEventListeners();
                                    });
                                });
                            } else {
                                self.unlockSeat(seat.seatID);
                                self.isHandlingOptionClick = false;
                            }
                        }, 100); // Small delay to ensure modal is rendered
                        }
                } else {
                    closeSeatInfo();
                }
            }
        });
    }

    //add to seat from seat price popup - old code
    async AddToCart(seatID, priceGroupDetailID) {
        const seat = Object.values(this.seatsDictionary).find(s => s.seatID == seatID);
        const userSession = await GetUserSession(readCookie("unique-org-id"));

        if(seat) {
            $.ajax({
                url: "/online/seatmap/GetpriceSelectionDropdown",  
                cache: false,
                async: true,
                data: {
                    eventDateID: eventDateID,
                    seatID: seat.seatID,
                    s: userSession
                },
                success: (data) => {
                    const seatCopy = { ...seat };
                    seatCopy.totals = [];
                    seatCopy.prices = [];
                    seatCopy.names = [];
                    seatCopy.priceGroupDetailIDs = [];
                    seatCopy.ticketTypeIDs = [];
                    
                    // Clear and populate the dropdown
                    data.forEach(function (option) {
                        seatCopy.totals.push(option.Total);
                        seatCopy.prices.push(option.Price);
                        seatCopy.names.push(option.Name);
                        seatCopy.priceGroupDetailIDs.push(option.PriceGroupDetailID);
                        seatCopy.ticketTypeIDs.push(option.TicketTypeID);
                    });
                    seat.totals = [...seatCopy.totals];
                    seat.prices = [...seatCopy.prices];
                    seat.names = [...seatCopy.names];
                    seat.priceGroupDetailIDs = [...seatCopy.priceGroupDetailIDs];
                    seat.ticketTypeIDs = [...seatCopy.ticketTypeIDs];
                    seat.selectedPrice = seat.priceGroupDetailIDs.indexOf(priceGroupDetailID);
                    seat.checkedPrices = true;
                    this.addSeatToCart(seat, seat.selectedPrice, priceGroupDetailID, false);
                    this.highlightSeatOnMap(seat, -1, true);
                },
                error: (xhr, status, error) => {
                    console.error('Error loading price options for seat:', seat.mapDtlID, error);
                }
            });
        }
    }
    
    //official add seat to cart function - new code
    async addSeatToCart(seat, optionIndex, priceGroupDetailID = -1, lockSeat = true, existing = false) {
        // Ensure priceGroupDetailID is always an integer
        priceGroupDetailID = Math.trunc(priceGroupDetailID);

        // Validate that the seat object has the required properties
        if (!seat || !seat.mapDtlID || !seat.totals || !seat.priceGroupDetailIDs) {
            console.error('Invalid seat object passed to addSeatToCart:', seat);
            return;
        }
        
        if (lockSeat) {
            this.lockSeat(seat.seatID);
        }

		// Create a unique key for the seat
        const seatKey = seat.mapDtlID;
        
        // Update seat selection info
        seat.isSelected = true;
        if (priceGroupDetailID == -1) {
            seat.selectedPrice = optionIndex;
        } else if (seat.selectedPriceIsTicketTypeID) {
            seat.selectedPrice = seat.ticketTypeIDs.indexOf(priceGroupDetailID);
        } else {
            seat.selectedPrice = seat.priceGroupDetailIDs.indexOf(priceGroupDetailID);
        }
        
        // Add to selected seats dictionary (this will overwrite if already exists)
        this.selectedSeats[seatKey] = seat;
        
        // Update cart indicator for this seat
        this.updateCartIndicator(seat, true);
        this.updateCartCount(true);
        
        if (this.currentSort == 'cart') {
            this.updateSeatList();
        }
        
        if ((seat.priceGroupDetailIDs[seat.selectedPrice]) > 0){
            handleTicketQty(1, -1, 'as', seat.priceGroupDetailIDs[seat.selectedPrice], true, seat.section, seat.seatID);
            if (!existing) {
                ChangeCartIconNumber(1, "as");
            }
        }
    }

    lockSeat(seatID) {
        this.lockedSeats[seatID] = seatID;
    }

    unlockSeat(seatID) {   
        this.lockedSeats[seatID] = null;
    }

    isSeatLocked(seatID) {
        return this.lockedSeats[seatID] != null || this.lockedSeats[seatID] != undefined;
    }

    async removeSeatFromCart(seat, lockSeat = true) {
        if (lockSeat) {
            this.lockSeat(seat.seatID);
        }

        const seatKey = seat.mapDtlID;
        
        if (this.selectedSeats[seatKey]) {
            delete this.selectedSeats[seatKey];
            seat.isSelected = false;
            seat.selectedPrice = null;
            
            // Update cart indicator for this seat
            this.updateCartIndicator(seat, false);
            ChangeCartIconNumber(-1, "as");

            this.updateCartCount(false);
            
            if (this.currentSort == 'cart') {
                this.updateSeatList();
            }

            handleTicketQty(-1, -1, 'as', seat.priceGroupDetailIDs[seat.selectedPrice], true, seat.section, seat.seatID);

            if (seat.types.find(t => t == 'Handicap')) {
                this.removeCompanionSeatFromCart();
            }
        }
    }

    removeCompanionSeatFromCart() {
        const companionSeat = Object.values(this.selectedSeats).find(s => s.types.find(t => t == 'Companion'));
        if (companionSeat) {
            this.highlightSeatOnMap(companionSeat, -1, false);
            this.removeSeatFromCart(companionSeat);
        }
    }

    async getCartInfo(orderID) {
        let userSession = await GetUserSession(readCookie("unique-org-id"));
        $.ajax({
            url: `/online/cart/GetCartInfoByOrderID`,
            type: 'GET',
            data: {
                orderId: orderID,
                s: userSession
            },
            success: (results) => {
                if (Array.isArray(results)) {
                    results.forEach(item => {                        
                        if (item.SeatID == null || item.SeatID == undefined || item.SeatID == 0) {
                            return;
                        }

                        const cartSeat = {};
                        cartSeat.seatID = item.SeatID;
                        cartSeat.priceGroupDetailID = item.PriceGroupDetailID;
                        cartSeat.Option2 = item.Option2;
                        cartSeat.Value2 = item.Value2;

                        const seat = Object.values(this.seatsDictionary).find(s => s.seatID == cartSeat.seatID);
                        if (seat == null || seat == undefined) {
                            console.warn('Seat not found in seatsDictionary:', cartSeat.seatID);
                            return;
                        }
                        $.ajax({
                            url: "/online/seatmap/GetpriceSelectionDropdown",  
                            cache: false,
                            async: true,
                            data: {
                                eventDateID: eventDateID,
                                seatID: seat.seatID,
                                s: userSession
                            },
                            success: (data) => {
                                const seatCopy = { ...seat };
                                seatCopy.totals = [];
                                seatCopy.prices = [];
                                seatCopy.names = [];
                                seatCopy.priceGroupDetailIDs = [];
                                seatCopy.ticketTypeIDs = [];
                                
                                // Clear and populate the dropdown
                                data.forEach(function (option) {
                                    seatCopy.totals.push(option.Total);
                                    seatCopy.prices.push(option.Price);
                                    seatCopy.names.push(option.Name);
                                    seatCopy.priceGroupDetailIDs.push(option.PriceGroupDetailID);
                                    seatCopy.ticketTypeIDs.push(option.TicketTypeID);
                                });
                                seat.totals = [...seatCopy.totals];
                                seat.prices = [...seatCopy.prices];
                                seat.names = [...seatCopy.names];
                                seat.priceGroupDetailIDs = [...seatCopy.priceGroupDetailIDs];
                                seat.ticketTypeIDs = [...seatCopy.ticketTypeIDs];
                                seat.checkedPrices = true;
                                if (cartSeat.Option2 == "TicketTypeID") {
                                    seat.selectedPriceIsTicketTypeID = true;
                                    seat.chosenTicketTypeID = parseInt(cartSeat.Value2);
                                    seat.selectedPrice = seat.ticketTypeIDs.indexOf(parseInt(cartSeat.Value2));
                                } else {
                                    seat.selectedPriceIsTicketTypeID = false;
                                    seat.chosenTicketTypeID = -1;
                                    seat.selectedPrice = seat.priceGroupDetailIDs.indexOf(cartSeat.priceGroupDetailID);//Change it
                                }
                                this.addSeatToCart(seat, seat.selectedPrice, cartSeat.priceGroupDetailID, false, true);
                                this.highlightQueue.push(seat);

                                this.forceSeatStatusChange(seat.mapDtlID, 'A'); 
                            },
                            error: (xhr, status, error) => {
                                console.error('Error loading price options for seat:', seat.mapDtlID, error);
                            }
                        });
                    });
                } else {
                    console.warn('Expected an array from GetCartInfo');
                }
            },
            error: (xhr, status, error) => {
                console.error('Error fetching cart info:', error);
            }
        }); 
        return true;
    }
    
    isSeatInCart(seat) {
        const seatKey = seat.mapDtlID;
        return this.selectedSeats.hasOwnProperty(seatKey);
    }

    getSelectedSeatCount() {
        return Object.keys(this.selectedSeats).length;
    }

    updateCartIndicator(seat, show) {
        const seatKey = seat.mapDtlID;
        const seatElement = this.seatListContainer.querySelector(`[data-seat-id="${seatKey}"]`);

        if (seatElement) {
            const cartIndicator = seatElement.querySelector('.CartIndicator');
            if (cartIndicator) {
                if (show) {
                    cartIndicator.style.display = 'block';
                    seatElement.classList.add('in-cart');
                    seatElement.classList.add('selected');
                } else {
                    cartIndicator.style.display = 'none';
                    seatElement.classList.remove('in-cart');
                    seatElement.classList.remove('selected');
                }
            }
        }
    }

	// update cart count
    updateCartCount(add) {
        const cartCount = Array.from(this.sortTabs).find(tab => tab.dataset.sort == 'cart');
        if (add) {
            cartCount.dataset.count = parseInt(cartCount.dataset.count) + 1;
        } else {
            cartCount.dataset.count = parseInt(cartCount.dataset.count) - 1;
        }
        if (parseInt(cartCount.dataset.count) < 1) {
            cartCount.innerHTML = translation.txtCart;
        } else {
            cartCount.innerHTML = translation.txtCart + " (" + parseInt(cartCount.dataset.count) + ")";
        }
        
        // Re-adjust sidebar width when cart count changes
        this.adjustSidebarWidth();
        this.updateMobileCTAVisibility();
    }

    // Connect to the seatmap app
    connectToSeatmap() {
        if (window.seatmapApp) {
            this.seatmapApp = window.seatmapApp;
        } else {
            console.warn('Seatmap app not found, retrying in 1 second...');
            setTimeout(() => this.connectToSeatmap(), 1000);
        }
    }

    addExistingCartItems() {
        const cartInfo = this.getCartInfo(orderID);
        if (cartInfo != null) {
            Object.keys(this.selectedSeats).forEach(seatKey => {
                const seat = this.selectedSeats[seatKey];
                this.forceSeatStatusChange(seat.mapDtlID, 'A');
            });
        }
    }

    forceSeatStatusChange(mapDtlID, status) {
        this.seatsDictionary[mapDtlID].status = status;
        if (this.seatmapApp) {
            this.seatmapApp.forceSeatStatusChange(mapDtlID, status);
        }
        // Find seat by ID directly in seatObjectsDictionary
    }

    // Highlight seat on the map when selected in sidebar
    highlightSeatOnMap(seat, optionIndex, highlight) {
        if (!this.seatmapApp) {
            //console.log('Seatmap app not connected');
            return;
        }
        // zoom to seat
        if (highlight) {
            const zoomSeat = this.seatmapApp.seatsDictionary[seat.mapDtlID];
            if (zoomSeat) {
                this.seatmapApp.zoomToSeat(zoomSeat);
            }
        }
        // Find the seat on the map by section, row, and seat number
        const targetSeat = this.seatmapApp.seatObjectsDictionary[seat.mapDtlID];
        this.unlockSeat(seat.seatID);
        if (targetSeat) {
            this.seatmapApp.onSeatClick(null, targetSeat, true);
        } else {
            // Trigger the seat click on the map
            const unloadedSeat = this.seatmapApp.seatsDictionary[seat.mapDtlID];
            if (unloadedSeat) {
                this.seatmapApp.zoomToSeat(unloadedSeat);
            }
            //console.log('Seat not found on map:', seat);
        }
    }

    // Method to highlight a specific seat in the sidebar (called from seatmap)
    highlightSeatInSidebar(seatKey) {
        const seat = this.seatsDictionary[seatKey];
        const seatIndex = this.filteredSeats.indexOf(seat);
        if (seatIndex > this.loadIndex * 20) {
            for (let i = this.loadIndex; i < (seatIndex / 20) + 1; i++) {
                this.loadMoreSeats();
            }
        }
        const seatElement = this.seatListContainer.querySelector(`[data-seat-id="${seatKey}"]`);
        
        if (seatElement) {
            // Toggle selection state
            if (seatElement.classList.contains('selected')) {
                seatElement.classList.remove('selected');
            } else {
                seatElement.classList.add('selected');
            }
            this.selectedSeat = seatElement;  
        }
        if (this.currentSort != 'cart') {
            this.currentSort = 'cart';
            this.updateSeatList();
            this.sortTabs.forEach(tab => {
                if (tab.dataset.sort == 'cart') {
                    tab.click();
                } 
            });
            this.loadIndex = 0;
        }
    }

    setPriceRange() {
        this.seats.forEach(seat => {
            // Find the minimum and maximum prices for this seat
            const minPrice = seat.minPrice;
            const maxPrice = seat.maxPrice;
            
            if (minPrice < this.seatMinPrice) {
                this.seatMinPrice = minPrice;
            }
            if (maxPrice > this.seatMaxPrice) {
                this.seatMaxPrice = maxPrice;
            }

            if (seat.totals[0] > this.seatMaxPrice) {
                this.seatMaxPrice = seat.totals[0];
            }
            if (seat.totals[0] < this.seatMinPrice) {
                this.seatMinPrice = seat.totals[0];
            }
        });
        
        this.minHandle.dataset.value = this.seatMinPrice;
        this.maxHandle.dataset.value = this.seatMaxPrice;
        this.userMinPrice = this.seatMinPrice;
        this.userMaxPrice = this.seatMaxPrice;
        this.minValueSpan.textContent = this.seatMinPrice;
        this.maxValueSpan.textContent = this.seatMaxPrice;
        this.minHandle.dataset.position = 0;
        this.maxHandle.dataset.position = 100;
    }

    startDragging(e, handle) {
        e.preventDefault();
        this.isDragging = true;
        this.activeHandle = handle;
        handle.style.transition = 'none'; // Disable transitions during drag
    }

    async fillSeats(seat, element, patternFillArrow) {
        const allSeats = element.parentElement.querySelectorAll('.SeatItem');
        const currentIndex = Array.from(allSeats).indexOf(element);
        const seatsToFill = Array.from(allSeats).slice(currentIndex + 1);
        
        // Process seats sequentially to avoid race conditions
        for (const seatElement of seatsToFill) {
            const dropdown = seatElement.querySelector('.priceOptionsDropdown');
            if (dropdown) {
                // Set the dropdown to the same option as the source seat
                dropdown.selectedIndex = seat.selectedPrice;
                
                // Trigger the change event
                dropdown.dispatchEvent(new Event('change'));
            }
        }
    }

    async priceSelectionDropdown(seatID, element, mapDtlID) {
        // Prevent multiple simultaneous calls for the same seat
        if (element.querySelector('.priceOption') || element.dataset.loading === 'true') {
            return;
        }
        
        const seat = this.seatsDictionary[mapDtlID];
        if (!seat) {
            console.error('Seat not found in dictionary:', mapDtlID);
            return;
        }
        
        // Mark as loading to prevent duplicate calls
        element.dataset.loading = 'true';

        let userSession = await GetUserSession(readCookie("unique-org-id"));


        if (seat.checkedPrices && seat.totals.length > 1) {
            const dropdownWrapper = document.querySelector(`.DropdownWrapper`);
            dropdownWrapper.innerHTML = `
                    <select class="priceOptionsDropdown uk-select" data-seat-id="${seat.mapDtlID}"></select>`;
            const dropdown = dropdownWrapper.querySelector('.priceOptionsDropdown');
            const optionElement = document.createElement('option');
            optionElement.className = 'priceOption';
            optionElement.value = seat.priceGroupDetailIDs[seat.selectedPrice];
            optionElement.dataset.ticketTypeID = seat.ticketTypeIDs[seat.selectedPrice];
            if (seat.selectedPriceIsTicketTypeID) {
                optionElement.selected = seat.chosenTicketTypeID == seat.ticketTypeIDs[seat.selectedPrice];
            } else {
                optionElement.selected = seat.selectedPrice == seat.priceGroupDetailIDs.indexOf(seat.priceGroupDetailIDs[seat.selectedPrice]);
            }
            optionElement.textContent = `${seat.names[seat.selectedPrice]} - ${currencySymbol}${seat.totals[seat.selectedPrice].toFixed(2)}`;
            dropdown.appendChild(optionElement);

            dropdown.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const ticketTypeID = parseInt(selectedOption.dataset.ticketTypeID);
                const priceGroupDetailID = parseInt(selectedOption.value);
                this.changeSeatOption(seatID, priceGroupDetailID, mapDtlID, element, ticketTypeID);
            });
            
            dropdown.classList.add('show');
        } else if (seat.checkedPrices && seat.totals.length == 1) {
            return
        } else {
            $.ajax({
                url: "/online/seatmap/GetpriceSelectionDropdown",
                cache: false,
                async: true,
                data: {
                    eventDateID: eventDateID,
                    seatID: seatID,
                    s: userSession
                },
                success: (data) => {
                    // Find the specific dropdown for this seat element
                    const dropdown = element.querySelector(`.uk-select`);
                    if (!dropdown) {
                        console.error('Dropdown not found for seat:', mapDtlID);
                        element.dataset.loading = 'false';
                        return;
                    }

                    // Create a copy of the seat data to avoid race conditions
                    const seatCopy = { ...seat };
                    seatCopy.totals = [];
                    seatCopy.prices = [];
                    seatCopy.names = [];
                    seatCopy.priceGroupDetailIDs = [];
                    seatCopy.ticketTypeIDs = [];
                    
                    // Clear and populate the dropdown
                    if (data.length > 1) {
                        dropdown.innerHTML = '';
                        data.forEach(function (option) {
                            seatCopy.totals.push(option.Total);
                            seatCopy.prices.push(option.Price);
                            seatCopy.names.push(option.Name);
                            seatCopy.priceGroupDetailIDs.push(option.PriceGroupDetailID);
                            seatCopy.ticketTypeIDs.push(option.TicketTypeID);
                            
                            const optionElement = document.createElement('option');
                            optionElement.className = 'priceOption';
                            optionElement.value = option.PriceGroupDetailID;
                            optionElement.dataset.ticketTypeID = option.TicketTypeID;
                            if (seatCopy.selectedPriceIsTicketTypeID) {
                                optionElement.selected = seatCopy.chosenTicketTypeID == option.TicketTypeID;
                            } else {
                                optionElement.selected = seatCopy.selectedPrice == seatCopy.priceGroupDetailIDs.indexOf(option.PriceGroupDetailID);
                            }
                            optionElement.textContent = `${option.Name} - ${currencySymbol}${option.Total.toFixed(2)}`;
                            dropdown.appendChild(optionElement);
                        });

                        // Remove existing event listeners to prevent duplicates
                        
                        // Add change event listener to the new dropdown
                        dropdown.addEventListener('change', (e) => {
                            const selectedOption = e.target.options[e.target.selectedIndex];
                            const ticketTypeID = parseInt(selectedOption.dataset.ticketTypeID);
                            const priceGroupDetailID = parseInt(selectedOption.value);
                            this.changeSeatOption(seatID, priceGroupDetailID, mapDtlID, element, ticketTypeID);
                        });
                        
                        dropdown.classList.add('show');
                    } else {
                        const dropDownWrapper = element.querySelector('.DropdownWrapper');
                        const option = data[0];
                        seatCopy.totals.push(option.Total);
                        seatCopy.prices.push(option.Price);
                        seatCopy.names.push(option.Name);
                        seatCopy.priceGroupDetailIDs.push(option.PriceGroupDetailID);
                        seatCopy.ticketTypeIDs.push(option.TicketTypeID);
                        if (dropDownWrapper) {
                            dropDownWrapper.innerHTML = `<div class="priceOptionsDropdown">${`${option.Name} - ${currencySymbol}${option.Total.toFixed(2)}`}</div>`;
                        }
                    }
                    
                    // Update the original seat object with the new data
                    seat.totals = [...seatCopy.totals];
                    seat.prices = [...seatCopy.prices];
                    seat.names = [...seatCopy.names];
                    seat.priceGroupDetailIDs = [...seatCopy.priceGroupDetailIDs];
                    seat.ticketTypeIDs = [...seatCopy.ticketTypeIDs];
                    seat.checkedPrices = true;
                    
                },
                error: (xhr, status, error) => {
                    console.error('Error loading price options for seat:', mapDtlID, error);
                },
                complete: () => {
                    // Always clear loading state
                    element.dataset.loading = 'false';
                }
            });
        }
    }
    
    drag(e) {
        if (!this.isDragging || !this.activeHandle) return;

        e.preventDefault();

        const rect = this.sliderTrack.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

        // Calculate position relative to track
        let position = ((clientX - rect.left) / rect.width) * 100;

        if (this.activeHandle == this.minHandle) {
            position = Math.max(0, Math.min(position, (parseFloat(this.maxHandle.dataset.position) - 5)));
        } else {
            position = Math.max((parseFloat(this.minHandle.dataset.position) + 5), Math.min(position, 100));
        }

        // Update handle position
        this.activeHandle.dataset.position = position;
        this.activeHandle.style.left = `${position}%`;
        this.activeHandle.dataset.value = Math.round(((position * (this.seatMaxPrice - this.seatMinPrice) / 100) + this.seatMinPrice) * 100) / 100;

        // Update display values
        this.updateSliderValues();
    }

    stopDragging() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.activeHandle.style.transition = ''; // Re-enable transitions
        this.activeHandle = null;
        this.resetSeatList();
    }

    updateSliderValues() {
        const values = Array.from(this.sliderHandles).map(handle =>
            parseFloat(handle.dataset.value)
        ).sort((a, b) => a - b);

        this.userMinPrice = values[0];
        this.userMaxPrice = values[1];

        if (this.minValueSpan) this.minValueSpan.textContent = values[0];
        if (this.maxValueSpan) this.maxValueSpan.textContent = values[1];
    }

    // bridges the html with actual functionality in JS
    setupEventListeners() {
        // Slider event listeners
        this.sliderHandles.forEach(handle => {
            // Mouse events
            handle.addEventListener('mousedown', (e) => this.startDragging(e, handle));
            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('mouseup', () => this.stopDragging());

            // Touch events for mobile
            handle.addEventListener('touchstart', (e) => this.startDragging(e, handle));
            document.addEventListener('touchmove', (e) => this.drag(e));
            document.addEventListener('touchend', () => this.stopDragging());
        });

        // Sort tab event listeners
        this.sortTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                this.sortTabs.forEach(t => t.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                this.loadIndex = 0;
                // Update sort type and re-render
                this.currentSort = tab.dataset.sort;
                // Sort seats based on current sort option
                this.sortedSeats = [...this.seats].sort((a, b) => {
                    if (this.currentSort === 'lowest') {
                        // Sort by lowest price for each seat
                        const aMinPrice = a.totals[a.defaultPrice];
                        const bMinPrice = b.totals[b.defaultPrice];
                        return aMinPrice - bMinPrice;
                    } else {
                        // Compare row letters (A is closer to stage than Z)
                        const aRow = a.row || '';
                        const bRow = b.row || '';
                        const aRowValue = aRow.charCodeAt(0) || 0; // A=65, B=66, etc.
                        const bRowValue = bRow.charCodeAt(0) || 0;
        
                        if (aRowValue !== bRowValue) {
                            return aRowValue - bRowValue; // Lower letter (A) comes first
                        }
        
                        // Then by lowest price
                        const aMinPrice = a.totals[a.defaultPrice];
                        const bMinPrice = b.totals[b.defaultPrice];
                        return aMinPrice - bMinPrice;
                    }
                });
                this.updateSeatList();
            });
		});

		// when presses -> send to checkout page - !!!todo -> update the overlay html / or load new overlay!!! 
        this.continueButton.addEventListener('click', () => {
            CloseSeatMap();
            ContinueCheckout();
        });

        this.resizeSeatMapHandler = () => {
            // get the height of the element SeatMapSidebar
            let SidebarContainer = document.getElementById('SeatMapSidebar');
            let SeatListContainer = document.getElementById('SeatListContainer');
            let height = SidebarContainer.offsetHeight - 260;
    
            // if the height is less than 100px, set the height to 100px
            if (height < 100) {
                SeatListContainer.style.height = "100px";
            } else {
                SeatListContainer.style.height = height + "px";
            }
    
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 800;
            
            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    this.swapToMobile();
                    this.updateMobileCTAVisibility();
                } else {
                    this.swapToDesktop();
                }
            }
            
            // Re-adjust sidebar width on resize
            this.adjustSidebarWidth();
        };

		// resize the ticket list container
        window.addEventListener('resize', this.resizeSeatMapHandler);

        // Add scroll event listener for infinite loading
        this.seatListContainer.addEventListener('scroll', () => {
            const scrollTop = this.seatListContainer.scrollTop;
            const scrollHeight = this.seatListContainer.scrollHeight;
            const clientHeight = this.seatListContainer.clientHeight;
            
            const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
            
            // Load more seats when user scrolls to 80% of the list
            if (scrollPercentage > 80 && this.currentSort !== 'cart') {
                this.loadMoreSeats();
            }
        });
    }

    
	// toggle mobile view
    swapToMobile() {
        this.mobileToggleButton.classList.add('mobile');
        this.multiSliderWrapper.classList.add('mobile');
        this.seatListSection.classList.add('mobile');
        this.seatListContainer.classList.add('mobile');
        this.sidebarFooter.classList.add('mobile');
        this.sidebarFooter.children[0].classList.add('mobile');

        this.sortTabs.forEach(tab => {
            tab.classList.add('mobile');
        });
        if (this.mobileToggleButton) this.mobileToggleButton.classList.add('mobile');
    }

    swapToDesktop() {
        this.mobileToggleButton.classList.remove('mobile');
        this.multiSliderWrapper.classList.remove('mobile');
        this.seatListSection.classList.remove('mobile');
        this.seatListContainer.classList.remove('mobile');
        this.sidebarFooter.classList.remove('mobile');
        this.sidebarFooter.children[0].classList.remove('mobile');

        this.sortTabs.forEach(tab => {
            tab.classList.remove('mobile');
        });
        if (this.mobileToggleButton) this.mobileToggleButton.classList.remove('mobile');
        this.sidebarContainer.style.transform = "";
    }

    setupMobileEventListeners() {
        // Toggle button click
        this.mobileToggleButton.addEventListener('pointerdown', () => {
            this.toggleMobilePanel();
        });

        // Close button click
        const closeButton = this.sidebarContainer.querySelector('.MobilePanelClose');
        closeButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.closeMobilePanel();
        });

        // Panel header drag to close
        const header = this.sidebarContainer.querySelector('.MobilePanelHeader');
        header.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startMobilePanelDrag(e.touches[0].clientY);
        });
        header.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startMobilePanelDrag(e.clientY);
        });

        // Drag events
        document.addEventListener('touchmove', (e) => {
            if (this.isMobilePanelDragging) {
                e.preventDefault();
                this.handleMobilePanelDrag(e.touches[0].clientY);
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (this.isMobilePanelDragging) {
                e.preventDefault();
                this.handleMobilePanelDrag(e.clientY);
            }
        });
        document.addEventListener('touchend', (e) => {
            if (this.isMobilePanelDragging) {
                e.preventDefault();
                this.endMobilePanelDrag();
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (this.isMobilePanelDragging) {
                e.preventDefault();
                this.endMobilePanelDrag();
            }
        });
    }

    toggleMobilePanel() {
        if (this.isMobilePanelOpen) {
            this.closeMobilePanel();
        } else {
            this.openMobilePanel();
        }
    }

    openMobilePanel() {
        this.isMobilePanelOpen = true;
        this.sidebarContainer.classList.add('show');
        // this.mobileToggleButton.classList.remove('mobile');   // ← remove this
        this.updateMobileCTAVisibility();                        // ← add this

        this.sidebarContainer.style.transform = "translateY(0)";
    }

    closeMobilePanel() {
        this.isMobilePanelOpen = false;
        this.sidebarContainer.style.transform = "translateY(100%)";

        setTimeout(() => {
            this.sidebarContainer.classList.remove('show');
            // this.mobileToggleButton.classList.add('mobile');     // ← remove this
            this.updateMobileCTAVisibility();                      // ← add this
        }, 300);
    }

    startMobilePanelDrag(clientY) {
        if (!this.isMobilePanelOpen)  {
            return;
        }

        this.isMobilePanelDragging = true;
        this.startY = clientY;
        
        // Get current transform position
        const currentTransform = this.sidebarContainer.style.transform;
        this.currentTranslateY = currentTransform ? 
            parseInt(currentTransform.replace('translateY(', '').replace('px)', '') || 0) : 0;
        
        this.sidebarContainer.style.transition = 'none';
    }

    handleMobilePanelDrag(clientY) {
        if (!this.isMobilePanelDragging) {
            return;
        }
        
        const deltaY = clientY - this.startY;
        const translateY = Math.max(0, this.currentTranslateY + deltaY);
        
        this.sidebarContainer.style.transform = `translateY(${translateY}px)`;
    }

    endMobilePanelDrag() {
        if (!this.isMobilePanelDragging) return;
        
        this.isMobilePanelDragging = false;
        this.sidebarContainer.style.transition = 'transform 0.3s ease-in-out';

        const currentTransform = this.sidebarContainer.style.transform;
        const currentTranslateY = currentTransform ? 
            parseInt(currentTransform.replace('translateY(', '').replace('px)', '') || 0) : 0;
        
        if (currentTranslateY > 100) {;
            this.closeMobilePanel();
        }
    }

    cleanupMobile() {
        this.mobilePanel = null;
        this.mobileToggleButton = null;
    }

    adjustSidebarWidth() {
        if (!this.sidebarContainer) return;

        if (this.isMobile) {
            this.sidebarContainer.style.removeProperty('width');
            const seatmapContainer = document.querySelector('.SeatmapContainer');
            seatmapContainer.style.removeProperty('width');
            return;
        }
        
        // Calculate the minimum width needed for sort tabs
        let maxTabWidth = 0;
        this.sortTabs.forEach(tab => {
            // Create a temporary span to measure text width
            const tempSpan = document.createElement('span');
            tempSpan.classList.add('SortTab');

            tempSpan.style.fontSize = window.getComputedStyle(tab).fontSize;
            tempSpan.style.fontFamily = window.getComputedStyle(tab).fontFamily;
            tempSpan.style.fontWeight = window.getComputedStyle(tab).fontWeight;
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            tempSpan.textContent = tab.textContent;
            
            document.body.appendChild(tempSpan);
            const textWidth = tempSpan.offsetWidth;
            document.body.removeChild(tempSpan);
            
            // Add padding (8px + 12px = 20px on each side)
            const tabWidth = textWidth + 28;
            if (tabWidth > maxTabWidth) {
                maxTabWidth = tabWidth;
            }
        });
        
        // Add some extra space for margins and borders
        const extraSpace = 20; // 20px margin on each side + borders + padding
        const minSidebarWidth = (maxTabWidth * this.sortTabs.length) + extraSpace;
        
        // Set minimum width for sidebar
        const currentWidth = this.sidebarContainer.offsetWidth;
        const newWidth = Math.max(minSidebarWidth, 350); // Minimum 350px, or calculated width

        if (newWidth > currentWidth) {
            this.sidebarContainer.style.width = newWidth + 'px';
            
            // Adjust the seatmap container width accordingly
            const seatmapContainer = document.querySelector('.SeatmapContainer');
            if (seatmapContainer) {
                seatmapContainer.style.setProperty('width', `calc(100% - ${newWidth}px)`, 'important');
            }
            this.seatmapApp.resizeQueued = true;
        }
    }

	// do cleanup
    cleanup() {
        // Remove event listeners
        if (this.resizeSeatMapHandler) {
            window.removeEventListener('resize', this.resizeSeatMapHandler);
        }
        
        // Clean up mobile
        this.cleanupMobile();
        
        // Clear references
        this.sidebarContainer = null;
        this.seatListContainer = null;
        this.seatmapApp = null;
    }
}
