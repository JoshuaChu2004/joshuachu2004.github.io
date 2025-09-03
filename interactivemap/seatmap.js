class SeatmapApp {
    // Static property to track the current instance
    static currentInstance = null;

    constructor() {

        this.app = null; //pixi app
        this.seats = []; //stored seat data, ready to use for seat generation
        this.seatsDictionary = {}; //dictionary of seats
        this.seatObjects = []; //generator seat objects, with the data from the seats array
        this.seatObjectsDictionary = {}; //dictionary of seats
        this.selectedSeats = [];
        this.zoomLevel = 1; //current zoom level
        this.zoomLevelMin = 1;
        this.zoomLevelMax = 8;
        this.isDragging = false; //is the user dragging the map
        this.dragStart = { x: 0, y: 0 }; //start position of the drag
        this.seatSize = 10; // default seat size - changed if the svg contains a size
        this.backgroundSVG = null; //background svg
        this.background = null;
        this.resizeQueued = false;

        // Minimap properties
        this.minimap = null;
        this.minimapContainer = null;
        this.minimapViewport = null;
        this.minimapVisible = false;
        this.minimapWidth = 200; // Size of the minimap in pixels
        this.minimapHeight = 160; // Size of the minimap in pixels
        this.isMinimapDragging = false;
        this.minimapSeatsCreated = false; // Track if minimap seats have been created

        this.currentPriceGroupFilter = null;

        this.modalContainer = null; //hover modal of seat info
        this.modalWidth = 200;
        this.modalHeight = 80;
        this.maxModalWidth = 300;
        this.smallFontSize = 10;
        this.smallFontColor = 0x606060;
        this.largeFontSize = 17;
        this.largeFontColor = 0x101010;

        this.sectionContainer = null; //section container
        this.isSectionVisible = false; //is the section visible
        this.isSectionGenerated = false; //is the section generated

        this.isMobile = false;
        this.activeTouches = new Map(); // Track active touches by pointerId
        this.initialTouchDistance = 0;
        this.initialZoomLevel = 1;
        this.isPinching = false;

        this.gridSize = 50; //grid size for spatial index
        this.maxGridDistance = 2;

        this.seatClickTime = 0;
        this.seatClickTimeThreshold = 200;

        // Set this as the current instance
        SeatmapApp.currentInstance = this;

        window.seatmapApp = this;

        this.init();
    }

    ensureContainerSize() {
        const container = document.getElementById('PixiContainer');
        if (!container) {
            console.error('PixiContainer not found');
            return;
        }

        // Force the container to have proper dimensions
        const popup = document.getElementById('SeatMapPopup');
        if (popup) {
                
            // Set explicit dimensions on the container
            container.style.width = '100%';
            container.style.minHeight = '400px'; // Minimum height
            if (!container.style.height.includes("px")) {
                container.style.height = container.style.height + 'px';
            }

        }
    }

    //initialize the seatmap
    init() {
        // Show loading spinner
        this.showLoadingSpinner();
        
        // Ensure container has proper dimensions before initializing

        // Create PIXI Application
        this.app = new PIXI.Application();

        const container = document.getElementById('PixiContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        // Initialize the application asynchronously (required in PixiJS 8.0)
        (async () => {
            await this.app.init({
                width: width,
                height: height,
                backgroundColor: 0xFFFFFF,
                antialias: true, // Enable antialiasing for better text quality
                resolution: Math.min(window.devicePixelRatio || 1, 2), // Cap resolution
                autoDensity: true,
                resizeTo: container,
                preference: "webgpu"
            });
            
            // force canvas to be the same height as the container - DEPRECATED: Was causing issues with iOS mobile and opera browsers
            //this.app.canvas.height = container.clientHeight;

            // Add to DOM
            document.getElementById('PixiContainer').appendChild(this.app.canvas);
            const url = document.getElementById('PixiContainer').dataset.seatmap;

            // Create main container for all seatmap elements
            this.mainContainer = new PIXI.Container();
            this.app.stage.addChild(this.mainContainer);

            // Create seat container
            this.seatContainer = new PIXI.Container();
            this.mainContainer.addChild(this.seatContainer);

            this.modalContainer = new PIXI.Container();
            this.app.stage.addChild(this.modalContainer);

            this.sectionContainer = new PIXI.Container();
            this.mainContainer.addChild(this.sectionContainer);


            // Wait for all initialization functions to complete sequentially
            await this.generateSeatmap(url);
            await this.initMinimap();
            this.setupEventListeners(); // This is synchronous, no await needed
            await this.setupSignalR();

            // check for mobile
            this.isMobile = window.innerWidth <= 800;

            // Reset all seat scales to ensure consistency
            this.resetAllSeatScales();
            this.resetView();

            // Update minimap
            this.checkMinimapVisibility();
            this.updateMinimapViewport();
            
            // Hide loading spinner when initialization is complete
            this.hideLoadingSpinner();
        })();
    }

    // grabs info from seatData and html/svg file and generates the seatmap
    async generateSeatmap(url) {        
        const seatDataMap = {};
        seatData.forEach(seat => {
            const key = seat.MapDtlID;
            if (!seatDataMap[key]) {
                seatDataMap[key] = []; // Initialize as array if not present
            }
            seatDataMap[key].push(seat); // Always push the seat object
        });

        try {
            // Check if URL points to HTML or SVG file
            const isHtmlFile = url.toLowerCase().includes('.html') || url.toLowerCase().includes('html');
            const isSvgFile = url.toLowerCase().includes('.svg') || url.toLowerCase().includes('svg');

            // Fetch the file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const fileText = await response.text();

            let svgElement;

            if (isHtmlFile) {
                // Parse HTML to extract SVG content
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(fileText, 'text/html');

                // Get the SVG element from the HTML
                svgElement = htmlDoc.querySelector('svg');
                if (!svgElement) {
                    throw new Error('No SVG element found in HTML');
                }
            } else if (isSvgFile) {
                // Parse SVG directly
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(fileText, 'image/svg+xml');
                svgElement = svgDoc.documentElement;
                if (!svgElement || svgElement.tagName !== 'svg') {
                    throw new Error('Invalid SVG file');
                }
            } else {
                throw new Error('File format not recognized. URL must contain "html" or "svg" to indicate file type.');
            }

            // Generate background image
            await this.generateBackground(svgElement.querySelector('image'), svgElement);

            // Find all seat elements
            const seatElements = svgElement.querySelectorAll('[data-component="svg_seat"]');

            // Create interactive seats from SVG data
            await this.generateSeats(seatElements, seatDataMap);
            
            //console.log(sections)
            //alert("sections");

            if (sections.length > 0) {
                this.generateSeatSections();
                this.isSectionGenerated = true;
            } else {
                this.isSectionGenerated = false;
                this.generateSeatObjects();
            }


        } catch (error) {
            console.error('Failed to load seatmap:', error);
        }
    }// load svg map image

    // loads the background image of the seatmap, if it fails, it creates a blank svg background
    async generateBackground(imageElement, svgElement) {
        if (imageElement) {
            const imageUrl = imageElement.getAttribute('href') || imageElement.getAttribute('src');
            if (imageUrl) {
                try {

                    const response = await fetch(imageUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const svgText = await response.text();

                    // Fix SVG dimensions using SVGEditor for Firefox compatibility and higher resolution
                    let dataUrl = imageUrl;
                    if (imageUrl.toLowerCase().includes('.svg') || imageUrl.toLowerCase().includes('svg')) {
                        const svgEditor = new SVGEditor();
                        const fixedSvgText = svgEditor.fixSVGDimensionsWithScale(svgText, 8000); // Scale by 2x for higher resolution


                        // Convert fixed SVG to data URL for loading
                        dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(fixedSvgText)));
                    }

                    this.backgroundSVG = await PIXI.Assets.load(dataUrl);
                    this.background = new PIXI.Sprite(this.backgroundSVG);
                    const viewBox = svgElement.getAttribute('viewBox');
                    let svgWidth = 800, svgHeight = 800; // Fallback defaults
                    if (viewBox) {
                        const viewBoxParts = viewBox.split(' ');
                        if (viewBoxParts.length === 4) {
                            svgWidth = parseFloat(viewBoxParts[2]);
                            svgHeight = parseFloat(viewBoxParts[3]);
                        }
                    }
                    const imageX = parseFloat(imageElement.getAttribute('x')) || 0;
                    const imageY = parseFloat(imageElement.getAttribute('y')) || 0;
                    const imageWidth = parseFloat(imageElement.getAttribute('width')) || svgWidth;
                    const imageHeight = parseFloat(imageElement.getAttribute('height')) || svgHeight;
                    this.background.x = imageX;
                    this.background.y = imageY;
                    this.background.width = imageWidth;
                    this.background.height = imageHeight;
                    this.background.alpha = 1;
                    this.seatContainer.addChild(this.background);
                
                } catch (bgError) {
                    console.warn('Could not load background image:', bgError);
                    
                    // Create a blank SVG background when image fails to load
                    try {
                        const viewBox = svgElement.getAttribute('viewBox');
                        let svgWidth = 8000, svgHeight = 8000; // Fallback defaults
                        if (viewBox) {
                            const viewBoxParts = viewBox.split(' ');
                            if (viewBoxParts.length === 4) {
                                svgWidth = parseFloat(viewBoxParts[2]);
                                svgHeight = parseFloat(viewBoxParts[3]);
                            }
                        }
                        
                        // Create a blank SVG with the same dimensions
                        const blankSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
                            <rect width="100%" height="100%" fill="#ffffff" stroke="#ff0000" stroke-width="1"/>
                        </svg>`;
                        
                        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(blankSvg)));
                        this.backgroundSVG = await PIXI.Assets.load(dataUrl);
                        this.background = new PIXI.Sprite(this.backgroundSVG);
                        
                        const imageX = parseFloat(imageElement.getAttribute('x')) || 0;
                        const imageY = parseFloat(imageElement.getAttribute('y')) || 0;
                        const imageWidth = parseFloat(imageElement.getAttribute('width')) || svgWidth;
                        const imageHeight = parseFloat(imageElement.getAttribute('height')) || svgHeight;
                        
                        this.background.x = imageX;
                        this.background.y = imageY;
                        this.background.width = imageWidth;
                        this.background.height = imageHeight;
                        this.background.alpha = 1;
                        this.seatContainer.addChild(this.background);
                        
                        console.log('Created blank SVG background as fallback');
                    } catch (fallbackError) {
                        console.error('Failed to create blank SVG background:', fallbackError);
                    }
                }
            }
        }
    }

    // section shapes
    generateSeatSections() {
        sections.forEach(section => {
            this.createSeatSection(section.points, section.label, section.color, section.seatCount);
        });
        this.offSeatHover();
    }

    // logic to create the section shapes
    createSeatSection(points, label, color, seatCount) {
        const graphics = new PIXI.Graphics();

        // fix null color
        if (color === null) {
            color = "#007bff";
        }

        this.drawShape(graphics, points, color);

        graphics.eventMode = 'static';
        graphics.cursor = 'pointer';
        graphics.on('pointerdown', () => {
            this.onSectionClick(graphics);
        });

        graphics.on('pointerover', () => {
            this.drawShape(graphics, points, 0x009900);
        });
        graphics.on('pointerout', () => {
            this.drawShape(graphics, points, color);
        });

        let centerX = 0;
        let centerY = 0;
        
        for (let i = 0; i < points.length; i+= 2) {
            centerX += points[i];
            centerY += points[i + 1];
        }
        centerX /= points.length / 2;
        centerY /= points.length / 2;

        const sectionTicketQuantity = new PIXI.Text(
            `${seatCount} seats`,
            {
                fontSize: 20,
                fill: '#000000',
                zIndex: 1000,
                textAlign: 'center'
            }
        )
        sectionTicketQuantity.x = centerX - sectionTicketQuantity.width / 2;
        sectionTicketQuantity.y = centerY - sectionTicketQuantity.height / 2;

        graphics.addChild(sectionTicketQuantity);

        this.sectionContainer.addChild(graphics);
    }

    // section click event
    onSectionClick(graphics) {
        const bounds = graphics.getBounds();
        this.zoom(Math.min(this.zoomLevelMax, this.zoomLevelMax / 2.5), (bounds.x + bounds.width / 2) - this.mainContainer.x, (bounds.y + bounds.height / 2) - this.mainContainer.y, true);
    }

    // draw custom shapes with sides
    // NOTE: NOT UPDATED TO WORK WITH CURRENT WAY SECTIONS ARE STORED
    drawCustomShape(graphics, sides, color) {
        graphics.clear();
        graphics.setFillStyle({ color: color, alpha: 0.5 });
        if (sides.length === 0) return;

        // Move to the start of the first side
        graphics.moveTo(sides[0].x1, sides[0].y1);

        // Draw each side as a continuous path
        sides.forEach((side, i) => {
            if (side.type === "Straight") {
                graphics.lineTo(side.x2, side.y2);
            } else if (side.type === "Curved") {
                graphics.quadraticCurveTo(side.cx, side.cy, side.x2, side.y2);
            }
        });

        graphics.fill();
    }

    // draw simple shapes with points
    drawShape(graphics, points, color) {
        graphics.clear();
        graphics.setFillStyle({ color: color, alpha: 0.5 });
        if (points.length === 0) return;

        // Move to the start of the first point
        graphics.moveTo(points[0], points[1]);

        // Draw each side as a continuous path
        for (let i = 2; i < points.length; i += 2) {
            graphics.lineTo(points[i], points[i + 1]);
        }

        graphics.fill();
    }

    // check to see if section should be visible, if not seats are rendered
    checkSectionVisibility() {
        const scalePercent = this.zoomLevel / this.zoomLevelMax;
        const shouldShowSections = scalePercent <= 0.2;

        // Determine what should be visible based on zoom level and available sections
        const shouldShowSectionView = shouldShowSections && sections.length > 0;
        const shouldShowSeatCircles = shouldShowSections && sections.length === 0;
        const shouldShowIndividualSeats = !shouldShowSections;
        
        // Handle section view (when sections exist and zoom is out)
        if (shouldShowSectionView) {
            if (!this.isSectionVisible) {
                // Transition to section view
                this.isSectionVisible = true;
                this.sectionContainer.visible = true;
                this.sectionContainer.removeChildren();
                
                // Clear individual seats from view
                if (this.seatContainer.children.length > 1) {
                    this.seatContainer.removeChildren(1);
                }
                
                this.generateSeatSections();
            }
            return;
        }
        
        // Handle seat circles view (when no sections exist and zoom is out)
        if (shouldShowSeatCircles) {
            if (!this.isSectionVisible) {
                // Transition to seat circles view
                this.isSectionVisible = true;
                this.sectionContainer.visible = true;
                this.sectionContainer.removeChildren();
                this.generateSeatCircles();
            }
            return;
        }
        
        // Handle individual seats view (when zoomed in)
        if (shouldShowIndividualSeats) {
            if (this.isSectionVisible) {
                // Transition from section/circles view to individual seats
                this.isSectionVisible = false;
                this.sectionContainer.visible = false;
                this.sectionContainer.removeChildren();
            }
            
            // Always ensure seat objects are generated and visible when in individual seats view
            if (this.seatObjects.length === 0) {
                this.generateSeatObjects();
            }
            this.updateVisibleSeats();
        }
    }

    // generate seats from seat data
    async generateSeats(seatElements, seatDataMap) {
        seatElements.forEach((seatElement, index) => {
            const x = parseFloat(seatElement.getAttribute('x'));
            const y = parseFloat(seatElement.getAttribute('y'));
            const width = parseFloat(seatElement.getAttribute('width'));
            const height = parseFloat(seatElement.getAttribute('height'));

            this.seatSize = width;

            // Get seat metadata
            const seatName = seatElement.getAttribute('data-seatname');
            const sectionElement = seatElement.closest('[data-sectionname]');
            const rowElement = seatElement.closest('[data-rowname]');

            const section = sectionElement ? sectionElement.getAttribute('data-sectionname') : 'Unknown';
            const row = rowElement ? rowElement.getAttribute('data-rowname') : '?';
            const mapdtlid = seatElement.getAttribute('data-mapdtlid');
            // Match the seat using row + seat
            const lookupKey = mapdtlid;
            const matchedSeats = seatDataMap[lookupKey];

            // Create seat label
            const label = `${section} - Row ${row} Seat ${seatName}`;
            const seat = {
                label: label,
                x: x,
                y: y,
                width: width,
                height: height,
                matchedSeats: matchedSeats,
                svgId: seatElement.getAttribute('id'),
                mapdtlid: mapdtlid,
                section: section,
                row: row,
                seatName: seatName,
                id: seatElement.getAttribute('id'),
            }
            this.seats.push(seat);
            this.seatsDictionary[mapdtlid] = seat;
        });
    }

    // generate seat objects from seat data
    generateSeatObjects() {
        this.seatObjects = [];
        this.seats.forEach(seatData => {
            const seat = this.createSeat(seatData);
            this.seatObjects.push(seat);
            this.seatObjectsDictionary[seat.seatData.mapdtlid] = seat;
        });

        // Build spatial index for faster viewport culling
        this.buildSpatialIndex();
        this.updateVisibleSeats();
        
        const sidebarHighlightQueue = window.seatmapSidebar.highlightQueue;

        // Update sidebar highlight queue
        for (const seat of sidebarHighlightQueue) {
            const mapSeat = this.seatObjectsDictionary[seat.mapDtlID];
            if (seat.status != mapSeat.seatData.status) { 
                mapSeat.seatData.status = seat.status;
                mapSeat.seatData.displayLabel =
                    mapSeat.seatData.status === "C"
                        ? "C"
                        : (mapSeat.seatData.seatLetter && mapSeat.seatData.seatLetter.trim() !== ""
                            ? mapSeat.seatData.seatLetter
                            : "A");
                mapSeat.seatData.color = mapSeat.seatData.labelColor;

                this.updateSeatColor(mapSeat);
                this.bindSeatEvents(mapSeat);
            }
            if (!mapSeat.seatData.isSelected) {
                this.onSeatClick(null, this.seatObjectsDictionary[seat.mapDtlID], true);
            }
        }
        window.seatmapSidebar.highlightQueue = [];
        
    }

    createSeat(seatData) {
        // Create seat using shared geometry (vector-based)
        const seat = new PIXI.Graphics();

        // Position the seat (center it within its bounds)
        seat.x = seatData.x + seatData.width / 2;
        seat.y = seatData.y + seatData.height / 2;

        // Make seat interactive
        seat.eventMode = 'static';
        seat.cursor = 'pointer';

        // Store seat data
        seat.seatData = {
            id: `seat_${seatData.x}_${seatData.y}`, // Add unique ID
            label: seatData.label,
            x: seatData.x,
            y: seatData.y,
            isSelected: false,
        };

        if (seatData.matchedSeats) {
            seat.seatData.price = [];
            seat.seatData.total = [];
            seat.seatData.sorting = [];
            seat.seatData.defaultPrice = -1;
            seat.seatData.name = [];
            seat.seatData.displayLabel = "";
            seat.seatData.seatLetter = "";
            seat.seatData.typeChosen = -1;
            seat.seatData.seatID = 0;
            seat.seatData.seat = null;
            seat.seatData.section = "";
            seat.seatData.priceGroupDetailID = [];
            seat.seatData.status = "A";
            seat.seatData.seatShowAsSold = false;
            seat.seatData.seatShow = false;
            seat.seatData.type = "Full Price";
            seat.seatData.color = "0x4CAF50";
            seat.seatData.labelColor = "0x4CAF50";
            for (const s of seatData.matchedSeats) {
                seat.seatData.price.push(s.Price);
                seat.seatData.total.push(s.Total);
                seat.seatData.sorting.push(s.Sorting);
                seat.seatData.defaultPrice = s.IsDefault ? seat.seatData.price.length - 1 : seat.seatData.defaultPrice;
                seat.seatData.name.push(s.Name);
                seat.seatData.displayLabel = s.Label;
                seat.seatData.seatLetter = s.SeatLetter;
                seat.seatData.seatID = s.SeatID;
                seat.seatData.seat = s.tSeat;
                seat.seatData.section = s.Section;
                seat.seatData.priceGroupDetailID.push(s.PriceGroupDetailID);
                seat.seatData.status = s.Status;
                seat.seatData.seatShowAsSold = s.SeatShowAsSold;
                seat.seatData.seatShow = s.SeatShow;
                seat.seatData.type = s.Type;
                seat.seatData.color = s.Color;
                seat.seatData.labelColor = s.LabelColor;
                seat.seatData.priceGroup = s.PriceGroupID;
            }
        } else {
            seat.seatData.price = [-1];
            seat.seatData.total = [-1];
            seat.seatData.sorting = [-1];
            seat.seatData.defaultPrice = -1;
            seat.seatData.name = ["Unknown"];
            seat.seatData.displayLabel = "";
            seat.seatData.seatLetter = "";
            seat.seatData.seatID = 0;
            seat.seatData.section = "";
            seat.seatData.priceGroupDetailID = [-1];
            seat.seatData.typeChosen = -1;
            seat.seatData.status = "";
            seat.seatData.seatShowAsSold = false;
            seat.seatData.seatShow = false;
            seat.seatData.type = "Full Price";
            seat.seatData.color = "#737373";
            seat.seatData.displayLabel = "";
            seat.seatData.labelColor = "0x4CAF50";
        }

        seat.seatData.svgId = seatData.svgId;
        seat.seatData.mapdtlid = seatData.mapdtlid;
        seat.seatData.section = seatData.section;
        seat.seatData.row = seatData.row;
        seat.seatData.seatName = seatData.seatName;
        seat.seatData.id = seatData.id;


        // Set initial color based on availability
        this.updateSeatColor(seat);

        // Attach interaction handlers
        this.bindSeatEvents(seat);

        return seat;
    }

    bindSeatEvents(seat) {
        seat.removeAllListeners(); // clear any previous listeners

        const isSelectable = isSeatSelectable(seat);

        if (isSelectable) {
            seat.eventMode = 'static';
            seat.cursor = 'pointer';
            
            // Store references to handlers so we can remove them later
            seat.pointerDownHandler = (event) => {
                this.seatClickTime = Date.now();
            };
            
            seat.pointerUpHandler = (event) => {
                const clickTime = Date.now() - this.seatClickTime;
                if (clickTime < this.seatClickTimeThreshold) {
                    this.onSeatClick(event, seat);
                }
            };
            
            seat.pointerOverHandler = (event) => this.onSeatHover(event, seat);
            seat.pointerOutHandler = () => this.offSeatHover(seat);
            
            seat.on('pointerdown', seat.pointerDownHandler);
            seat.on('pointerup', seat.pointerUpHandler);
            seat.on('pointerover', seat.pointerOverHandler);
            seat.on('pointerout', seat.pointerOutHandler);
        } else {
            seat.eventMode = 'none';
            seat.cursor = 'default';
        }
    }

    // Method to remove specific event listeners from a seat
    removeSeatEventListeners(seat) {
        if (seat.pointerDownHandler) {
            seat.off('pointerdown', seat.pointerDownHandler);
        }
        if (seat.pointerUpHandler) {
            seat.off('pointerup', seat.pointerUpHandler);
        }
        if (seat.pointerOverHandler) {
            seat.off('pointerover', seat.pointerOverHandler);
        }
        if (seat.pointerOutHandler) {
            seat.off('pointerout', seat.pointerOutHandler);
        }
        
        // Clear the handler references
        delete seat.pointerDownHandler;
        delete seat.pointerUpHandler;
        delete seat.pointerOverHandler;
        delete seat.pointerOutHandler;
    }

    onSeatClick(event, seat, sidebar = false) {
        // Block interaction if seat is no longer selectable (e.g., after status update)
        const isSelectable = (isSeatSelectable(seat) && window.seatmapSidebar.isSeatLocked(seat.seatData.seatID) == false && !window.seatmapSidebar.isHandlingOptionClick );

        
        if (!isSelectable) {
            console.warn(`Seat ${seat.seatData.label} is not selectable due to status: ${seat.seatData.status}`);
            return;
        }

        // Toggle selection
        if (seat.seatData.isSelected) {
            seat.seatData.isSelected = false;
            const index = this.selectedSeats.indexOf(seat);
            if (index > -1) this.selectedSeats.splice(index, 1);
        } else {
            seat.seatData.isSelected = true;
            this.selectedSeats.push(seat);
        }

        if (!sidebar) {
            this.notifySidebarOfSeatClick(seat, seat.seatData.isSelected);
        }

        this.updateSeatColor(seat);
        this.sectionContainer.removeChildren();
        this.generateSeatCircles();
    }

    // Notify sidebar when a seat is clicked on the map
    notifySidebarOfSeatClick(seat, selected) {
        if (window.seatmapSidebar) {
            if (selected) {
                window.seatmapSidebar.highlightSeatInSidebar(seat.seatData.mapdtlid);
                // Find the corresponding seat in the sidebar's data structure
                const sidebarSeat = window.seatmapSidebar.seatsDictionary[seat.seatData.mapdtlid];
                if (sidebarSeat) {
                    window.seatmapSidebar.isHandlingOptionClick = true;
                    window.seatmapSidebar.showSeatPopup(sidebarSeat, seat.seatData.total, seat.seatData.priceGroupDetailID[0]);
                }
            } else {
                // Find the corresponding seat in the sidebar's data structure
                const sidebarSeat = window.seatmapSidebar.seatsDictionary[seat.seatData.mapdtlid];
                if (sidebarSeat && window.seatmapSidebar.isSeatInCart(sidebarSeat)) {
                    window.seatmapSidebar.removeSeatFromCart(sidebarSeat);
                }
                window.seatmapSidebar.highlightSeatInSidebar(seat.seatData.mapdtlid);
            }
        }
    }

    // hover loading seat info (should be ajax)
    onSeatHover(event, seat) {
        this.modalContainer.removeChildren();
        if (this.isMobile) {
            return;
        }

        const seatHoverEffect = new PIXI.Graphics();
        seatHoverEffect.setStrokeStyle({ color: 0xffffff, alpha: 1.0 });

        
        const halfSize = this.seatSize / 2;
        if (seatMapShape == "c") {
            seatHoverEffect.circle(0, 0, halfSize);
        } else if (seatMapShape == "s") {
            seatHoverEffect.roundRect(-halfSize, -halfSize, this.seatSize, this.seatSize, 2);
        }
        seatHoverEffect.stroke();
        seat.addChild(seatHoverEffect);
        seat.seatData.hoverEffect = seatHoverEffect;

        let offsetY = 0;
        if (seat.seatData.type === "Handicap" || seat.seatData.type === "Companion") {
            offsetY = 25;
        }

        const modalHeight = this.modalHeight + offsetY;
        const bg = new PIXI.Graphics();
        bg.setFillStyle({ color: 0xffffff, alpha: 1.0 });
        bg.setStrokeStyle({ width: 4, color: 0xdadada });
        bg.roundRect(0, 0, this.modalWidth * 2, modalHeight * 2, 16);  // moved here
        bg.stroke();
        bg.fill();
        bg.scale.set(0.5);
        this.modalContainer.addChild(bg);

        const globalSeatPosition = seat.toGlobal(new PIXI.Point(0, 0));
        this.modalContainer.x = globalSeatPosition.x - this.modalWidth / 2;
        this.modalContainer.y = globalSeatPosition.y - modalHeight - (10 * this.zoomLevel) - 10;

        if (this.modalContainer.y < 0) {
            this.modalContainer.y = globalSeatPosition.y + (10 * this.zoomLevel) + 10;
        }

        // Store the modal position for reuse
        this._lastHoverPosition = { x: this.modalContainer.x, y: this.modalContainer.y };

        const sectionContainer = new PIXI.Container();
        sectionContainer.x = 15;
        sectionContainer.y = 15;
        
        const sectionContainerBackground = new PIXI.Graphics();
        sectionContainerBackground.setFillStyle({ color: seat.seatData.color, alpha: 0.1 });
        sectionContainerBackground.roundShape([
            { x: -(sectionContainer.x * 2), y: -(sectionContainer.y * 2), radius: 16 },
            { x: (this.modalWidth * 2) - (sectionContainer.x * 2), y: -(sectionContainer.y * 2), radius: 16 },
            { x: (this.modalWidth * 2) - (sectionContainer.x * 2), y: (this.modalHeight) - (sectionContainer.y * 2) - 15, radius: 0 },
            { x: -(sectionContainer.x * 2), y: (this.modalHeight) - (sectionContainer.y * 2) - 15, radius: 0 }
        ], 10)
        sectionContainerBackground.fill();
        sectionContainer.addChild(sectionContainerBackground);

        const sectionContainerBottomBorder = new PIXI.Graphics();
        sectionContainerBottomBorder.setStrokeStyle({ width: 2, color: 0xdadada});
        sectionContainerBottomBorder.moveTo(-sectionContainer.x * 2, (this.modalHeight) - (sectionContainer.y * 2) - 15);
        sectionContainerBottomBorder.lineTo(this.modalWidth * 2 - sectionContainer.x * 2, (this.modalHeight) - (sectionContainer.y * 2) - 15);
        sectionContainerBottomBorder.stroke();
        sectionContainer.addChild(sectionContainerBottomBorder);

        if (seat.seatData.type === "Handicap") {
            // Add wheelchair icon using Unicode or a custom character
            const adaIcon = new PIXI.Text("♿", {
                fontSize: this.largeFontSize * 2,
                fill: 0x0000FF
            });
            adaIcon.x = -20;
            adaIcon.y = -16;
            adaIcon.scale.set(0.8);
            sectionContainer.addChild(adaIcon);

            // ADA Accessible label
            const adaLabel = new PIXI.Text(translation.txtAdaAccessible.toUpperCase(), {
                fontSize: this.smallFontSize * 2,
                fill: 0x0000FF
            });
            adaLabel.x = -sectionContainer.x;
            adaLabel.y = sectionContainer.height - adaLabel.height;
            sectionContainer.addChild(adaLabel);
        } else if (seat.seatData.type === "Companion") {
            // Add wheelchair icon using Unicode or a custom character
            const adaIcon = new PIXI.Text("♿", {
                fontSize: this.largeFontSize * 2,
                fill: seat.seatData.color
            });
            adaIcon.x = -20;
            adaIcon.y = -16;
            adaIcon.scale.set(0.8);
            sectionContainer.addChild(adaIcon);

            // ADA Companion label
            const adaLabel = new PIXI.Text(translation.txtAdaCompanion.toUpperCase(), {
                fontSize: this.smallFontSize * 2,
                fill: seat.seatData.color
            });
            adaLabel.x = -sectionContainer.x;
            adaLabel.y = sectionContainer.height - adaLabel.height;
            sectionContainer.addChild(adaLabel);
        } else {
            let fillColor = 0x000000;
            if (typeof seat.seatData.color === 'string') {
                // Remove # if present and convert to hex format
                const hexString = seat.seatData.color.replace('#', '');
                fillColor = parseInt('0x' + hexString, 16);
            } else if (typeof seat.seatData.color === 'number') {
                fillColor = seat.seatData.color;
            }

            const sectionCircle = new PIXI.Graphics();
            sectionCircle.setFillStyle({ color: fillColor, alpha: 1.0 });
            sectionCircle.setStrokeStyle({ width: 2, color: this.darkenColor(fillColor, 0.8) });
            sectionCircle.circle(0, 0, 15);
            sectionCircle.fill();
            sectionCircle.stroke();
            sectionContainer.addChild(sectionCircle);
        }

        // Main section value (e.g., "Right")
        const section = new PIXI.Text(seat.seatData.section, {
            fontSize: this.largeFontSize * 2,
            fill: this.largeFontColor,
            fontWeight: 'normal',
            wordWrap: false,
            wordWrapWidth: (this.maxModalWidth * 2) - 20,
        });
        section.x = 26;
        section.y = -19;
        if (section.height > 50) {
            bg.clear();
            bg.setFillStyle({ color: 0xffffff, alpha: 1.0 });
            bg.setStrokeStyle({ width: 4, color: 0xdadada });
            bg.roundRect(0, 0, this.maxModalWidth * 2, (this.modalHeight + (section.height - 25)) * 2, 16);  // moved here
            bg.stroke();
            bg.fill();
            bg.scale.set(0.5);
            this.modalContainer.y -= (section.height - 25);
            this.modalContainer.x = globalSeatPosition.x - this.maxModalWidth / 2;
        }
        sectionContainer.addChild(section);

        

        offsetY += section.height - 30;

        sectionContainer.scale.set(0.5);
        this.modalContainer.addChild(sectionContainer);

        // Row label
        const rowLabel = new PIXI.Text(translation.txtRow.toUpperCase(), { fontSize: this.smallFontSize * 2, fill: this.smallFontColor });
        rowLabel.scale.set(0.5);
        rowLabel.x = 10;
        rowLabel.y = 30 + offsetY;
        this.modalContainer.addChild(rowLabel);

        const rowValue = new PIXI.Text(seat.seatData.row, { fontSize: this.largeFontSize * 2, fill: this.largeFontColor });
        rowValue.scale.set(0.5);
        rowValue.x = rowLabel.x + rowLabel.width / 2 - rowValue.width / 2;
        rowValue.y = rowLabel.y + 15;
        this.modalContainer.addChild(rowValue);

        // Seat label
        const seatLabel = new PIXI.Text(translation.txtSeat.toUpperCase(), { fontSize: this.smallFontSize * 2, fill: this.smallFontColor });
        seatLabel.scale.set(0.5);
        seatLabel.x = (bg.width / 2 - seatLabel.width / 2) - 2;
        seatLabel.y = 30 + offsetY;
        seatLabel.scale.set(0.5);
        this.modalContainer.addChild(seatLabel);

        const seatNumber = new PIXI.Text(seat.seatData.seatName, { fontSize: this.largeFontSize * 2, fill: this.largeFontColor });
        seatNumber.scale.set(0.5);
        seatNumber.x = seatLabel.x + seatLabel.width / 2 - seatNumber.width / 2;
        seatNumber.y = seatLabel.y + 15;
        this.modalContainer.addChild(seatNumber);

        // Price label
        const priceLabel = new PIXI.Text(translation.txtPrice.toUpperCase(), { fontSize: this.smallFontSize * 2, fill: this.smallFontColor });
        priceLabel.scale.set(0.5);
        priceLabel.x = (bg.width - priceLabel.width - 10) - 5;
        priceLabel.y = 30 + offsetY;
        this.modalContainer.addChild(priceLabel);

        const price = new PIXI.Text(seat.seatData.total[0].toFixed(2), {
            fontSize: this.largeFontSize * 2,
            fill: this.largeFontColor
        });
        price.scale.set(0.5);
        price.x = priceLabel.x + priceLabel.width / 2 - price.width / 2;
        price.y = priceLabel.y + 15;
        this.modalContainer.addChild(price);

    }

    offSeatHover(seat = null) {
        this.modalContainer.removeChildren();
        if (seat && seat.seatData.hoverEffect) {
            seat.removeChild(seat.seatData.hoverEffect);
        }
        
    }

	// define seat color / shape / border
    updateSeatColor(seat) {
        const rawColor = seat.seatData.color;
        let fillColor;

        if (typeof rawColor === 'string') {
            // Remove # if present and convert to hex format
            const hexString = rawColor.replace('#', '');
            fillColor = parseInt('0x' + hexString, 16);
        } else if (typeof rawColor === 'number') {
            fillColor = rawColor;
        }

        const isSeartOnCartOrSold = seat.seatData.status == "C" || seat.seatData.status == "S" || seat.seatData.status == "U";
        const isSelected = seat.seatData.isSelected;

        if (isSeartOnCartOrSold) {
            const hexString = seatMapColorSold.replace('#', '');
            fillColor = parseInt('0x' + hexString, 16);
        }
        if (isSelected) {
            fillColor = 0xFF9800;
        }

        // Final safety check to ensure fillColor is valid
        if (isNaN(fillColor) || fillColor < 0 || fillColor > 0xFFFFFF) {
            fillColor = 0x4CAF50; // Fallback to default green
        }

        const borderColor = this.darkenColor(fillColor, 0.8);

        // Clear and redraw seat
        seat.clear();
        seat.setFillStyle({ color: fillColor, alpha: 1.0 });
        if (outline) {
            seat.setStrokeStyle({ width: 2, color: borderColor });
        }
        const halfSize = this.seatSize / 2;
        if (seatMapShape == "c") {
            seat.circle(0, 0, halfSize);
        } else if (seatMapShape == "s") {
            seat.roundRect(-halfSize, -halfSize, this.seatSize, this.seatSize, 2);
        }
        seat.stroke();
        seat.fill();

        // Remove existing tick and status text (if any)
        if (seat.tickMark && seat.tickMark.parent) {
            seat.removeChild(seat.tickMark);
        }
        if (seat.statusText && seat.statusText.parent) {
            seat.removeChild(seat.statusText);
        }

        const displayLabelColor = this.getContrastTextColor(fillColor);


        // Add tick mark if selected
        if (isSelected) {
            const tick = new PIXI.Text("✔", {
                fontSize: 24, // Larger
                fill: 0x000000,
                fontWeight: 'bold'
            });
            tick.anchor.set(0.5);
            tick.scale.set(0.5);
            tick.x = 0;
            tick.y = 0;
            seat.addChild(tick);
            seat.tickMark = tick;
        } else if (salesMethod != 'online') {
            seat.tickMark = null;
            const statusText = new PIXI.Text(seat.seatData.displayLabel, {
                fontSize: 24,
                fill: displayLabelColor,
                align: 'center'
            });
            // Scale text inversely to zoom level to keep it crisp
            statusText.scale.set((seat.height / statusText.height) * 0.9);
            statusText.anchor.set(0.5);
            seat.addChild(statusText);
            seat.statusText = statusText;
        }
        
    }

    filterByPriceGroup(priceGroup) {
        if (this.currentPriceGroupFilter == priceGroup) {
            this.currentPriceGroupFilter = null;
            for (const seat of this.seatObjects) {
                seat.alpha = 1;
            }
        } else {
            this.currentPriceGroupFilter = priceGroup;
            for (const seat of this.seatObjects) {
                if (seat.seatData.priceGroup == priceGroup.PriceGroupID) {
                    seat.alpha = 1;
                } else {
                    seat.alpha = 0.15;
                }
            }
        }
    }

    forceSeatStatusChange(mapDtlID, status) {
        const mapSeat = this.seatObjectsDictionary[mapDtlID];
        if (mapSeat) {
            if (mapSeat.seatData.status != status) { 
                mapSeat.seatData.status = status;
                mapSeat.seatData.displayLabel =
                    mapSeat.seatData.status === "C"
                        ? "C"
                        : (mapSeat.seatData.seatLetter && mapSeat.seatData.seatLetter.trim() !== ""
                            ? mapSeat.seatData.seatLetter
                            : "A");
                mapSeat.seatData.color = mapSeat.seatData.labelColor;
                

                this.updateSeatColor(mapSeat);
                this.bindSeatEvents(mapSeat);
                this.onSeatClick(null, mapSeat, true);
            }
        }
    }

    getContrastTextColor(hexColor) {
        // Handle invalid colors
        if (!hexColor || isNaN(hexColor)) {
            return "#000000"; // Default to black text
        }
        
        let hex = typeof hexColor === 'number'
            ? hexColor.toString(16).padStart(6, '0')
            : hexColor.toString().replace(/^#|0x/, '');

        // Validate hex string
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
            return "#000000"; // Default to black text for invalid hex
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance > 160 ? "#000000" : "#FFFFFF";
    }

    darkenColor(hexColor, factor = 0.8) {
        const r = Math.floor(((hexColor >> 16) & 0xFF) * factor);
        const g = Math.floor(((hexColor >> 8) & 0xFF) * factor);
        const b = Math.floor((hexColor & 0xFF) * factor);
        return (r << 16) + (g << 8) + b;
    }

    darkenColorToRGB(hexColor, factor = 0.8) {
        const r = Math.floor(((hexColor >> 16) & 0xFF) * factor);
        const g = Math.floor(((hexColor >> 8) & 0xFF) * factor);
        const b = Math.floor((hexColor & 0xFF) * factor);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // NEW: Viewport culling method
    updateVisibleSeats() {        
        if (!this.seatContainer) {
            return;
        }

        //console.log("updateVisibleSeats");

        // Cache viewport calculations to avoid recalculation
        const currentViewport = this.calculateViewportBounds();

        // Skip update if viewport hasn't changed significantly - Needed to check the seatcontainer children length
        if (this.lastViewport && this.isViewportSimilar(currentViewport, this.lastViewport) && this.seatContainer.children.length > 1) {
            return;
        }

        this.lastViewport = currentViewport;

        // Clear all seats from container (keep background at index 0)
        if (this.seatContainer.children.length > 1) {
            this.seatContainer.removeChildren(1);
        }

        // Use progressive rendering to eliminate pop-in effect
        this.renderSeatsProgressively(currentViewport);
    }

    // Progressive rendering to eliminate pop-in effect
    renderSeatsProgressively(viewport) {
        if (this.spatialIndex) {
            this.renderSeatsFromSpatialIndex(viewport);
        } else {
            this.renderSeatsFromArray(viewport);
        }
    }

    // Render seats from spatial index with immediate display
    renderSeatsFromSpatialIndex(viewport) {
        const minGridX = Math.floor(viewport.left / this.gridSize) - 1;
        const maxGridX = Math.ceil(viewport.right / this.gridSize) + 1;
        const minGridY = Math.floor(viewport.top / this.gridSize) - 1;
        const maxGridY = Math.ceil(viewport.bottom / this.gridSize) + 1;

        const seenSeats = new Set();
        let totalSeatsFound = 0;

        // Process grid cells with immediate seat addition
        const processGridCell = (gridX, gridY) => {
            const key = `${gridX},${gridY}`;
            const seatsInGrid = this.spatialIndex.get(key);

            if (seatsInGrid) {
                seatsInGrid.forEach(seat => {
                    if (!seenSeats.has(seat)) {
                        seenSeats.add(seat);

                        this.seatContainer.addChild(seat);
                        totalSeatsFound++;
                    }
                });
            }
        };

        // Process all grid cells immediately (no batching for now)
        for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
            for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
                processGridCell(gridX, gridY);
            }
        }

        //console.log("totalSeatsFound", totalSeatsFound);
        //console.log("seatContainer:", this.seatContainer);
    }

    // Render seats from array with immediate display
    renderSeatsFromArray(viewport) {
        const visibleSeats = [];
        const seatSize = this.seatSize;

        // Process all seats and add visible ones immediately
        for (let i = 0; i < this.seatObjects.length; i++) {
            const seat = this.seatObjects[i];
            const seatX = seat.x;
            const seatY = seat.y;

            // Check if seat is partially visible (not just completely contained)
            // Seat is visible if any part of it intersects with the viewport
            if (seatX + seatSize >= viewport.left && seatX - seatSize <= viewport.right &&
                seatY + seatSize >= viewport.top && seatY - seatSize <= viewport.bottom) {
                this.seatContainer.addChild(seat);
                visibleSeats.push(seat);
            }
        }
    }

    // Calculate viewport bounds with caching
    calculateViewportBounds() {
        const padding = 10;
        const viewportLeft = (-this.mainContainer.x / this.zoomLevel) - padding;
        const viewportTop = (-this.mainContainer.y / this.zoomLevel) - padding;
        const viewportRight = viewportLeft + (this.app.screen.width / this.zoomLevel) + (padding * 2);
        const viewportBottom = viewportTop + (this.app.screen.height / this.zoomLevel) + (padding * 2);

        return {
            left: viewportLeft,
            top: viewportTop,
            right: viewportRight,
            bottom: viewportBottom,
            width: viewportRight - viewportLeft,
            height: viewportBottom - viewportTop
        };
    }

    // Check if viewport has changed significantly (avoid unnecessary updates)
    isViewportSimilar(newViewport, oldViewport) {
        if (!oldViewport) return false;

        const threshold = 50; // pixels
        return Math.abs(newViewport.left - oldViewport.left) < threshold &&
            Math.abs(newViewport.top - oldViewport.top) < threshold &&
            Math.abs(newViewport.width - oldViewport.width) < threshold &&
            Math.abs(newViewport.height - oldViewport.height) < threshold;
    }

    // Build spatial index for faster seat lookup (call this after generating seats)
    buildSpatialIndex() {
        if (this.seatObjects.length < 1000) {
            // For smaller seatmaps, brute force is fine
            this.spatialIndex = null;
            return;
        }

        // Simple grid-based spatial index
        this.spatialIndex = new Map();

        this.seatObjects.forEach(seat => {
            const gridX = Math.floor(seat.x / this.gridSize);
            const gridY = Math.floor(seat.y / this.gridSize);
            const key = `${gridX},${gridY}`;

            if (!this.spatialIndex.has(key)) {
                this.spatialIndex.set(key, []);
            }
            this.spatialIndex.get(key).push(seat);
        });

        // Draw the spatial index grid for debugging
        this.drawSpatialIndexGrid();
    }

    // Draw the spatial index grid for visualization
    drawSpatialIndexGrid() {
        if (!this.spatialIndex) return;

        // Create grid container if it doesn't exist
        if (!this.gridContainer) {
            this.gridContainer = new PIXI.Container();
            this.gridContainer.visible = false; // Start hidden
            this.mainContainer.addChild(this.gridContainer);
        }

        // Clear existing grid
        this.gridContainer.removeChildren();

        // Get bounds of all seats
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.seatObjects.forEach(seat => {
            minX = Math.min(minX, seat.x);
            minY = Math.min(minY, seat.y);
            maxX = Math.max(maxX, seat.x);
            maxY = Math.max(maxY, seat.y);
        });

        // Calculate grid bounds
        const startGridX = Math.floor(minX / this.gridSize);
        const endGridX = Math.floor(maxX / this.gridSize);
        const startGridY = Math.floor(minY / this.gridSize);
        const endGridY = Math.floor(maxY / this.gridSize);

        // Draw grid lines
        const gridGraphics = new PIXI.Graphics();
        gridGraphics.setStrokeStyle({ width: 1, color: 0x00FF00, alpha: 0.3 });

        // Vertical lines
        for (let gridX = startGridX; gridX <= endGridX; gridX++) {
            const x = gridX * this.gridSize;
            gridGraphics.moveTo(x, minY);
            gridGraphics.lineTo(x, maxY);
        }

        // Horizontal lines
        for (let gridY = startGridY; gridY <= endGridY; gridY++) {
            const y = gridY * this.gridSize;
            gridGraphics.moveTo(minX, y);
            gridGraphics.lineTo(maxX, y);
        }

        gridGraphics.stroke();
        this.gridContainer.addChild(gridGraphics);

        // Draw grid cell labels (optional - for debugging)
        const labelGraphics = new PIXI.Container();
        for (let gridX = startGridX; gridX <= endGridX; gridX++) {
            for (let gridY = startGridY; gridY <= endGridY; gridY++) {
                const key = `${gridX},${gridY}`;
                const seatsInGrid = this.spatialIndex.get(key);
                
                if (seatsInGrid && seatsInGrid.length > 0) {
                    const centerX = (gridX + 0.5) * this.gridSize;
                    const centerY = (gridY + 0.5) * this.gridSize;
                    
                    const label = new PIXI.Text(key, {
                        fontSize: 12,
                        fill: 0xFF0000,
                        fontWeight: 'bold'
                    });
                    label.anchor.set(0.5);
                    label.x = centerX;
                    label.y = centerY;
                    labelGraphics.addChild(label);
                }
            }
        }
        this.gridContainer.addChild(labelGraphics);
    }

    // Toggle grid visibility
    toggleSpatialIndexGrid() {
        if (this.gridContainer) {
            this.gridContainer.visible = !this.gridContainer.visible;
        }
    }

    // Add method to reset all seat scales to ensure consistency
    resetAllSeatScales() {
        this.seatObjects.forEach(seat => {
            seat.scale.set(1.0);
        });
    }

    generateSeatCircles() {
        const gridsOccupied = [];
        const coordinatesOccupied = {};
        for (const seat of this.selectedSeats) {
            const gridX = Math.floor(seat.x / this.gridSize);
            const gridY = Math.floor(seat.y / this.gridSize);
            const key = `${gridX},${gridY}`;
            if (coordinatesOccupied[key] == undefined) {
                coordinatesOccupied[key] = gridsOccupied.length;
                const grid = {
                    x: Math.floor(seat.x / this.gridSize),
                    y: Math.floor(seat.y / this.gridSize),
                    seats: [seat],
                    seen: false,
                    gridGroup: null
                }
                gridsOccupied.push(grid);
            } else {
                gridsOccupied[coordinatesOccupied[key]].seats.push(seat);
            }
        }

        const gridGroups = [];
        for (const grid of gridsOccupied) {
            if (grid.gridGroup == null) {
                grid.gridGroup = {
                    grids: [grid],
                    accumulatedX: 0,
                    accumulatedY: 0,
                    accumulatedSeats: 0
                };
                for (const seat of grid.seats) {
                    grid.gridGroup.accumulatedX += seat.x;
                    grid.gridGroup.accumulatedY += seat.y;
                    grid.gridGroup.accumulatedSeats += 1;
                }
                gridGroups.push(grid.gridGroup);
            }

            grid.seen = true;
            
            for (const grid2 of gridsOccupied) {
                if ((grid.x == grid2.x && grid.y == grid2.y) || grid2.seen) {
                    continue;
                }
                const distance = this.getDistance(grid, grid2);

                if (distance < this.maxGridDistance) {
                    grid.gridGroup.grids.push(grid2);
                    grid2.gridGroup = grid.gridGroup;
                    grid2.seen = true;
                    for (const seat of grid2.seats) {
                        grid2.gridGroup.accumulatedX += seat.x;
                        grid2.gridGroup.accumulatedY += seat.y;
                        grid2.gridGroup.accumulatedSeats += 1;
                    }
                }
            }
        }
        for (const gridGroup of gridGroups) {
            this.createSeatCircle(gridGroup);
        }

    }

    // create a seat circle for a clump of seats
    createSeatCircle(gridGroup) {
        const centerX = gridGroup.accumulatedX / gridGroup.accumulatedSeats;
        const centerY = gridGroup.accumulatedY / gridGroup.accumulatedSeats;
        let radius = this.gridSize/2 - 10;

        for (const grid of gridGroup.grids) {
            for (const seat of grid.seats) {
                const distance = this.getDistance(seat, {x: centerX, y: centerY});
                if (distance > radius) {
                    radius = distance;
                }
            }
        }

        radius = Math.max(radius, 40);

        const seatCircle = new PIXI.Graphics();
        seatCircle.setFillStyle({ color: 0x222222, alpha: 0.25 });
        seatCircle.setStrokeStyle({ color: 0x000000, alpha: 0.25, width: 1 });
        seatCircle.circle(centerX, centerY, radius + 10);
        seatCircle.fill();
        seatCircle.stroke();

        seatCircle.eventMode = 'none';
        seatCircle.cursor = 'not-allowed';

        this.sectionContainer.addChild(seatCircle);
    }

    getDistance(grid1, grid2) {
        return Math.sqrt(Math.pow(grid1.x - grid2.x, 2) + Math.pow(grid1.y - grid2.y, 2));
    }

    // load mini map
    async initMinimap() {
        // Create minimap container
        this.minimapContainer = new PIXI.Container();
        this.minimapContainer.visible = false;
        this.minimapContainer.x = this.app.screen.width - this.minimapWidth - 10;
        this.minimapContainer.y = 10;
        this.app.stage.addChild(this.minimapContainer);

        while (this.backgroundSVG == null) {
            await new Promise(resolve => setTimeout(resolve, 50)); // check every 50ms
        }

        // Create minimap background (so minimap is not transparent)
        const minimapBg = new PIXI.Graphics();
        minimapBg.setFillStyle({ color: 0xFFFFFF, alpha: 1 });
        minimapBg.rect(0, 0, this.minimapWidth, this.minimapHeight);
        minimapBg.fill();
        this.minimapContainer.addChild(minimapBg);

        const minimapSVG = new PIXI.Sprite(this.backgroundSVG);
        minimapSVG.x = 0;
        minimapSVG.y = 0;
        minimapSVG.width = this.minimapWidth;
        minimapSVG.height = this.minimapHeight;
        minimapSVG.alpha = 1;
        this.minimapContainer.addChild(minimapSVG);

        // Create minimap background (add after SVG so border renders on top)
        const border = new PIXI.Graphics();
        border.setStrokeStyle({ width: 1, color: 0xdadada });
        border.roundRect(0, 0, this.minimapWidth, this.minimapHeight, 0);
        border.stroke();

        this.minimapContainer.addChild(border);

        // Create minimap content container
        this.minimap = new PIXI.Container();
        this.minimapContainer.addChild(this.minimap);

        // Create viewport indicator (shows current view area)
        this.minimapViewport = new PIXI.Graphics();
        this.minimapViewport.setFillStyle({ color: 0x999999, alpha: 0.15 });
        this.minimapViewport.setStrokeStyle({ width: 2, color: 0x999999, alpha: 0.5 });
        this.minimapViewport.rect(0, 0, 50, 50);
        this.minimapViewport.fill();
        this.minimapViewport.stroke();
        this.minimapContainer.addChild(this.minimapViewport);

        // Make minimap interactive
        this.minimapContainer.eventMode = 'static';
        this.minimapContainer.cursor = 'pointer';
        this.minimapContainer.on('pointerdown', (event) => {
            this.onMinimapClick(event);
        });

        // Initially hide minimap
    }

    onMinimapClick(event) {
        if (!this.minimapVisible) return;

        const bounds = this.getBackgroundBounds();
        const minimapContentWidth = this.minimapWidth;
        const minimapContentHeight = this.minimapHeight;
        const scaleX = minimapContentWidth / (bounds.right - bounds.left);
        const scaleY = minimapContentHeight / (bounds.bottom - bounds.top);
        const minimapScale = Math.min(scaleX, scaleY);

        // Get click position relative to minimap content (accounting for padding)
        const clickX = event.data.global.x - this.minimapContainer.x;
        const clickY = event.data.global.y - this.minimapContainer.y;

        // Convert to world coordinates
        const worldX = bounds.left + (clickX / scaleX);
        const worldY = bounds.top + (clickY / scaleY);

        // Calculate new container position to center the clicked world point on screen
        const newX = this.app.screen.width / 2 - worldX * this.zoomLevel;
        const newY = this.app.screen.height / 2 - worldY * this.zoomLevel;

        // Clamp to bounds
        const bounds2 = this.calculateMaxMinScreenPosition();
        const clampedX = this.clamp(newX, bounds2.minX, bounds2.maxX);
        const clampedY = this.clamp(newY, bounds2.minY, bounds2.maxY);

        // Apply new position
        this.mainContainer.x = clampedX;
        this.mainContainer.y = clampedY;

        this.updateMinimapViewport();
        this.checkSectionVisibility();
    }

    checkMinimapVisibility() {
        const bounds = this.getBackgroundBounds();
        const scaledBounds = {
            left: bounds.left * this.zoomLevel,
            right: bounds.right * this.zoomLevel,
            top: bounds.top * this.zoomLevel,
            bottom: bounds.bottom * this.zoomLevel
        };

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        // Check if entire seatmap fits in view
        const seatmapWidth = scaledBounds.right - scaledBounds.left;
        const seatmapHeight = scaledBounds.bottom - scaledBounds.top;

        const isFullyVisible = seatmapWidth <= screenWidth && seatmapHeight <= screenHeight;

        // Show/hide minimap based on visibility
        if (isFullyVisible) {
            this.minimapContainer.visible = false;
            this.minimapVisible = false;
            return;
        } else {
            this.minimapContainer.visible = true;
            this.minimapVisible = true;
        }

        return isFullyVisible;
    }

    // updates minimap info
    updateMinimapViewport() {
        if (!this.minimapViewport || !this.minimapVisible) return;
        if (window.innerWidth <= 800) {
            this.minimapContainer.visible = false;
            this.minimapVisible = false;
            this.minimapViewport.clear();
            return false;
        }

        const bounds = this.getBackgroundBounds();
        const minimapContentWidth = this.minimapWidth;
        const minimapContentHeight = this.minimapHeight;
        const scaleX = minimapContentWidth / (bounds.right - bounds.left);
        const scaleY = minimapContentHeight / (bounds.bottom - bounds.top);
        const minimapScale = Math.min(scaleX, scaleY);

        // Calculate current viewport in world coordinates
        const viewportLeft = -this.mainContainer.x / this.zoomLevel;
        const viewportTop = -this.mainContainer.y / this.zoomLevel;
        const viewportRight = viewportLeft + this.app.screen.width / this.zoomLevel;
        const viewportBottom = viewportTop + this.app.screen.height / this.zoomLevel;

        // Calculate the scaled viewport dimensions
        const scaledViewportWidth = (viewportRight - viewportLeft) * scaleX;
        const scaledViewportHeight = (viewportBottom - viewportTop) * scaleY;

        // Convert to minimap coordinates
        const minimapX = (viewportLeft - bounds.left) * scaleX;
        const minimapY = (viewportTop - bounds.top) * scaleY;
        const minimapWidth = scaledViewportWidth;
        const minimapHeight = scaledViewportHeight;

        // Clamp the viewport to stay within minimap bounds
        const clampedX = Math.max(0, Math.min(minimapX, this.minimapWidth - minimapWidth));
        const clampedY = Math.max(0, Math.min(minimapY, this.minimapHeight - minimapHeight));

        // Ensure the viewport doesn't extend beyond minimap boundaries
        const finalWidth = Math.min(minimapWidth, this.minimapWidth - clampedX);
        const finalHeight = Math.min(minimapHeight, this.minimapHeight - clampedY);

        const fillPercent = (finalWidth / this.minimapWidth) * (finalHeight / this.minimapHeight);
        // Hide minimap if viewport is too large to display properly
        if (fillPercent > 0.9) {
            this.minimapContainer.visible = false;
            this.minimapVisible = false;
            this.minimapViewport.clear();
            return false;
        }

        // Update viewport indicator
        this.minimapViewport.clear();
        this.minimapViewport.setFillStyle({ color: 0x222222, alpha: 0.25 });
        this.minimapViewport.setStrokeStyle({ width: 1, color: 0x222222, alpha: 0.45 });
        this.minimapViewport.rect(clampedX, clampedY, finalWidth, finalHeight);
        this.minimapViewport.fill();
        this.minimapViewport.stroke();
    }

    resize() {
        const container = document.getElementById('PixiContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.app.renderer.resize(width, height);
        this.minimapContainer.x = width - this.minimapWidth - 20;
        this.minimapContainer.y = 20;

        if (this.app && this.app.canvas) {
            this.ensureContainerSize();
        }
        this.isMobile = window.innerWidth <= 800;

    }

    // event listeners for clicks etc.
    setupEventListeners() {
        // Handle window resize to ensure container stays properly sized

        this.resizeSeatMapHandler = () => {
            const container = document.getElementById('PixiContainer');
            const width = container.clientWidth;
            const height = container.clientHeight;
            this.app.renderer.resize(width, height);
            this.minimapContainer.x = width - this.minimapWidth - 20;
            this.minimapContainer.y = 20;

            if (this.app && this.app.canvas) {
                this.ensureContainerSize();
            }
            this.isMobile = window.innerWidth <= 800;

            if (this.isMobile) {
                this.checkMinimapVisibility();
                this.updateMinimapViewport();
            }

        };

        window.addEventListener('resize', this.resizeSeatMapHandler);

        // Mouse events for panning
        this.app.stage.eventMode = 'static';
        this.app.stage.on('pointerdown', (event) => {
            // Store the touch/pointer
            this.activeTouches.set(event.data.pointerId, {
                x: event.data.global.x,
                y: event.data.global.y,
                startX: event.data.global.x,
                startY: event.data.global.y
            });

            // Check if we have multiple touches (pinch gesture)
            if (this.activeTouches.size === 2) {
                this.handlePinchStart();
            } else if (this.activeTouches.size === 1) {
                // Single touch - handle as normal drag
                const touch = this.activeTouches.get(event.data.pointerId);

                if (this.minimapVisible) {
                    const bounds = this.getMinimapBounds();
                    if (touch.x >= bounds.left && touch.x <= bounds.right &&
                        touch.y >= bounds.top && touch.y <= bounds.bottom) {
                        this.isMinimapDragging = true;
                        return;
                    }
                }

                this.isDragging = true;
                this.dragStart = event.data.global.clone();
            }
        });

        this.app.stage.on('pointermove', (event) => {
            // Update the touch position
            if (this.activeTouches.has(event.data.pointerId)) {
                const touch = this.activeTouches.get(event.data.pointerId);
                touch.x = event.data.global.x;
                touch.y = event.data.global.y;
            }

            if (this.isPinching && this.activeTouches.size === 2) {
                this.handlePinchMove();
            } else if (this.isDragging && this.activeTouches.size === 1) {
                const touch = this.activeTouches.get(event.data.pointerId);
                if (touch) {
                    const deltaX = touch.x - this.dragStart.x;
                    const deltaY = touch.y - this.dragStart.y;

                    // Calculate new position
                    const newX = this.mainContainer.x + deltaX;
                    const newY = this.mainContainer.y + deltaY;

                    // Get bounds and clamp the position
                    const bounds = this.calculateMaxMinScreenPosition();
                    const clampedX = this.clamp(newX, bounds.minX, bounds.maxX);
                    const clampedY = this.clamp(newY, bounds.minY, bounds.maxY);

                    // Apply the clamped position
                    this.mainContainer.x = clampedX;
                    this.mainContainer.y = clampedY;

                    // Update drag start to the current position
                    this.dragStart.x = touch.x;
                    this.dragStart.y = touch.y;

                    // Update minimap
                    this.checkMinimapVisibility();
                    this.updateMinimapViewport();
                    this.checkSectionVisibility();
                }
            } else if (this.isMinimapDragging) {
                this.onMinimapClick(event);
            }
        });

        this.app.stage.on('pointerup', (event) => {
            // Remove the touch from active touches
            this.activeTouches.delete(event.data.pointerId);

            // If we had 2 touches and now have 1, stop pinching
            if (this.activeTouches.size === 1) {
                this.isPinching = false;
                // Resume normal dragging with the remaining touch
                const remainingTouch = this.activeTouches.values().next().value;
                this.dragStart = { x: remainingTouch.x, y: remainingTouch.y };
                this.isDragging = true;
            } else if (this.activeTouches.size === 0) {
                // No more touches
                this.isDragging = false;
                this.isMinimapDragging = false;
                this.isPinching = false;
            }
        });

        this.pointerUpHandler = () => {
            this.isDragging = false;
            this.isMinimapDragging = false;
        };

        window.addEventListener('pointerup', this.pointerUpHandler);

        // Mouse wheel for zooming
        this.app.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();

            // Get mouse position relative to the view
            const rect = this.app.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const zoomSpeed = 0.15;
            const zoomFactor = event.deltaY > 0 ? 1 - zoomSpeed : 1 + zoomSpeed;
            this.zoom(this.zoomLevel * zoomFactor, mouseX, mouseY);
        });

        // UI Controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.zoom(this.zoomLevel + 0.2);
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.zoom(this.zoomLevel - 0.2);
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.resetView();
        });

        if (document.getElementById('toggle-grid')) {
            document.getElementById('toggle-grid').addEventListener('click', () => {
                this.toggleSpatialIndexGrid();
            });
        }
    }

    getBackgroundBounds() {
        return {
            left: this.background.position.x,
            right: this.background.position.x + this.background.width,
            top: this.background.position.y,
            bottom: this.background.position.y + this.background.height,
            width: this.background.width,
            height: this.background.height
        };
    }

    getMinimapBounds() {
        // The minimap background is expanded by 200px to the right
        // The actual minimap content starts at x + 100 (10px padding + 90px offset)
        const minimapStartX = this.minimapContainer.x;
        const minimapStartY = this.minimapContainer.y;

        return {
            left: minimapStartX,
            right: minimapStartX + this.minimapWidth,
            top: minimapStartY,
            bottom: minimapStartY + this.minimapHeight
        };
    }

    calculateMaxMinScreenPosition() {
        const bounds = this.getBackgroundBounds();

        // Calculate the scaled bounds (accounting for zoom)
        const scaledLeft = bounds.left * this.zoomLevel;
        const scaledRight = bounds.right * this.zoomLevel;
        const scaledTop = bounds.top * this.zoomLevel;
        const scaledBottom = bounds.bottom * this.zoomLevel;

        // Calculate the screen bounds

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        // For X-axis: container.x + scaledLeft should be >= 0 (left edge visible)
        // and container.x + scaledRight should be <= screenWidth (right edge visible)
        const maxX = -scaledRight + screenWidth - this.minimap.width;  // Maximum X (prevents right edge from going off-screen)
        const minX = -scaledLeft + this.minimap.width;                 // Minimum X (prevents left edge from going off-screen)

        // For Y-axis: container.y + scaledTop should be >= 0 (top edge visible)
        // and container.y + scaledBottom should be <= screenHeight (bottom edge visible)
        const maxY = -scaledBottom + screenHeight; // Maximum Y (prevents bottom edge from going off-screen)
        const minY = -scaledTop;                   // Minimum Y (prevents top edge from going off-screen)

        return {
            minX: Math.min(minX, maxX) - this.minimap.width, // In case the seatmap is smaller than screen
            maxX: Math.max(minX, maxX) + this.minimap.width,
            minY: Math.min(minY, maxY) - this.minimap.height, // In case the seatmap is smaller than screen
            maxY: Math.max(minY, maxY) + this.minimap.height
        };
    }

    // global zoom function
    zoom(zoomLevel, x = null, y = null, center = false) {
        // Calculate the point under the mouse before zoom
        if (x && y) {
            const currentZoomLevel = this.zoomLevel;

            if (center) {
                this.zoomLevel = zoomLevel;
                this.zoomLevel = Math.max(this.zoomLevelMin, Math.min(this.zoomLevelMax, this.zoomLevel));
                const zoomScale = this.zoomLevel / currentZoomLevel;

                this.mainContainer.scale.set(this.zoomLevel);
                this.mainContainer.x = -(x * zoomScale) + this.app.screen.width / 2;
                this.mainContainer.y = -(y * zoomScale) + this.app.screen.height / 2;

            } else {
                // Convert screen coordinates to world coordinates before zoom
                const worldPointBeforeZoom = {
                    x: (x - this.mainContainer.x) / this.zoomLevel,
                    y: (y - this.mainContainer.y) / this.zoomLevel
                };

                // Apply new zoom level
                this.zoomLevel = zoomLevel;
                this.zoomLevel = Math.max(this.zoomLevelMin, Math.min(this.zoomLevelMax, this.zoomLevel));
                this.mainContainer.scale.set(this.zoomLevel);

                // Calculate where the world point should be after zoom to keep it under the cursor
                const worldPointAfterZoom = {
                    x: (x - this.mainContainer.x) / this.zoomLevel,
                    y: (y - this.mainContainer.y) / this.zoomLevel
                };

                // Adjust container position to keep the same world point under the cursor
                this.mainContainer.x += (worldPointAfterZoom.x - worldPointBeforeZoom.x) * this.zoomLevel;
                this.mainContainer.y += (worldPointAfterZoom.y - worldPointBeforeZoom.y) * this.zoomLevel;
            }

            // Clamp to bounds after zoom
        } else {
            this.zoomLevel = zoomLevel;
            this.zoomLevel = Math.max(this.zoomLevelMin, Math.min(this.zoomLevelMax, this.zoomLevel));
            this.mainContainer.scale.set(this.zoomLevel);
        }
        const bounds = this.calculateMaxMinScreenPosition();
        const clampedX = this.clamp(this.mainContainer.x, bounds.minX, bounds.maxX); 
        const clampedY = this.clamp(this.mainContainer.y, bounds.minY, bounds.maxY);

        // Apply the clamped position
        this.mainContainer.x = clampedX;
        this.mainContainer.y = clampedY;
        
        this.checkSectionVisibility();

        // Update minimap
        this.checkMinimapVisibility();
        this.updateMinimapViewport();

        // Update grid if visible
        if (this.gridContainer && this.gridContainer.visible) {
            this.drawSpatialIndexGrid();
        }
    }

    // calculate zoom to seat
    zoomToSeat(seat) {
        //if section shape is visible
        if (this.isSectionVisible && this.isSectionGenerated) {
            this.zoom(this.zoomLevelMax * 0.3, this.zoomLevel * (seat.x + seat.width / 2), this.zoomLevel * (seat.y + seat.height / 2), true);
        } else {
            this.zoom(this.zoomLevel, this.zoomLevel * (seat.x + seat.width / 2), this.zoomLevel * (seat.y + seat.height / 2), true);
        }
        return this.zoomLevel;
    }

    // click on recenter icon will reset the seatmap
    resetView() {
        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;
        const bgBounds = this.getBackgroundBounds();
        const zoomScale = Math.min(screenWidth / bgBounds.width, screenHeight / bgBounds.height);
        this.zoomLevelMin = zoomScale;
        this.zoomLevel = zoomScale;
        this.zoom(zoomScale);
        this.centerView();
    }

    // helper function to resize the map to the center
    centerView() {
        this.mainContainer.x = 0;
        this.mainContainer.y = 0;

        const bounds = this.getBackgroundBounds();
        const centerX = (bounds.left + bounds.right) / 2;
        const centerY = (bounds.top + bounds.bottom) / 2;

        this.mainContainer.x = this.app.screen.width / 2 - centerX * this.zoomLevel;
        this.mainContainer.y = this.app.screen.height / 2 - centerY * this.zoomLevel;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // Calculate distance between two points
    getDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate center point between two touches
    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.x + touch2.x) / 2,
            y: (touch1.y + touch2.y) / 2
        };
    }

    // Handle pinch start
    handlePinchStart() {
        const touches = Array.from(this.activeTouches.values());
        if (touches.length === 2) {
            this.initialTouchDistance = this.getDistance(touches[0], touches[1]);
            this.initialZoomLevel = this.zoomLevel;
            this.isPinching = true;
            this.isDragging = false;
        }
    }

    // Handle pinch move
    handlePinchMove() {
        const touches = Array.from(this.activeTouches.values());
        if (touches.length === 2) {
            const currentDistance = this.getDistance(touches[0], touches[1]);
            const scale = currentDistance / this.initialTouchDistance;
            const newZoomLevel = this.initialZoomLevel * scale;

            // Clamp zoom level
            const clampedZoom = this.clamp(newZoomLevel, this.zoomLevelMin, this.zoomLevelMax);

            // Get center point for zoom
            const centerPoint = this.getTouchCenter(touches[0], touches[1]);

            // Apply zoom
            this.zoom(clampedZoom, centerPoint.x, centerPoint.y);
        }
    }

    // Helper method to find a seat by different possible identifiers
    findSeatByIdentifier(identifier) {
        // Try to find the seat using different possible keys
        let seat = this.seatObjectsDictionary[identifier];

        // If not found by direct key, try to find by seatID (from the seat data)
        if (!seat) {
            seat = Object.values(this.seatObjectsDictionary).find(s => s.seatData.seatID == identifier);
        }

        // If still not found, try to find by mapdtlid
        if (!seat) {
            seat = Object.values(this.seatObjectsDictionary).find(s => s.seatData.mapdtlid == identifier);
        }

        return seat;
    }

    // seat socket
    async setupSignalR() {
        try {
            const container = document.getElementById('PixiContainer');
            const websocketGroupName = container ?.dataset.websocketGroupName;
            const orderId = container ?.dataset.orderId;

            if (!websocketGroupName || !orderId) {
                console.warn("Missing WebSocket group name or order ID.");
                return;
            }

            if (!window.signalRInitialized || !window.signalRSeatHub) {
                console.warn("SignalR not ready yet.");
                return;
            }

            const myListener = (seatId, seatStatus) => {
                // Find seat by ID directly in seatObjectsDictionary
                const seat = this.findSeatByIdentifier(seatId);
                if (!seat) {
                    console.warn(`Seat not found for ID: ${seatId}`);
                    return;
                }
                seat.seatData.status = seatStatus;
                seat.seatData.displayLabel =
                    seatStatus === "C"
                        ? "C"
                        : (seat.seatData.seatLetter && seat.seatData.seatLetter.trim() !== ""
                            ? seat.seatData.seatLetter
                            : "A");

                this.updateSeatColor(seat);
                this.bindSeatEvents(seat);
            };

            // Avoid duplicate
            if (!window._seatStatusListeners.includes(myListener)) {
                window._seatStatusListeners.push(myListener);
            }

            // Join group if ready
            if (window.signalRIsConnected) {
                window.signalRSeatHub.server.joinGroup(orderId, websocketGroupName);
            } else {
                window.signalRJoinQueue.push({ orderID: orderId, groupName: websocketGroupName });
            }

            this.isWebsocketConnected = true;
        } catch (err) {
            console.error("Seatmap SignalR error:", err.message);
        }
    }

    // Show loading spinner
    showLoadingSpinner() {
        const spinner = document.getElementById('SeatMapLoadingSpinner');
        const container = document.getElementById('SeatMapContainer');
        
        if (spinner) {
            spinner.style.display = 'flex';
        }
        
        if (container) {
            container.classList.add('loading');
        }
        
        // Block all mouse events on the entire page
        document.body.style.pointerEvents = 'none';
        document.body.style.cursor = 'wait';
    }

    // Hide loading spinner
    hideLoadingSpinner() {
        const spinner = document.getElementById('SeatMapLoadingSpinnerOverlay');
        const container = document.getElementById('SeatMapRoot');
        
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        if (container) {
            container.classList.remove('loading');
        }
        
        // Restore mouse events
        document.body.style.pointerEvents = 'auto';
        document.body.style.cursor = 'auto';
    }

    cleanup() {
        // Remove event listeners
        if (this.resizeSeatMapHandler) {
            window.removeEventListener('resize', this.resizeSeatMapHandler);
        }

        if (this.pointerUpHandler) {
            window.removeEventListener('pointerup', this.pointerUpHandler);
        }
    }
}


