class SeatmapIndex {
    constructor() {
        this.seatIndex = null;
        this.indexContainer = null;
        this.indexHeader = null;
        this.indexItems = [];
        this.indexContainerHeight = 0;
        this.selectedItemIndex = null;
        this.init();
    }

    init() {
        this.seatIndex = document.querySelector('.SeatMapIndex');
        this.indexContainer = document.querySelector('.IndexContainer');
        this.indexHeader = document.querySelector('.SeatMapIndexHeader');

        let seatMapColorSoldRaw = seatMapColorSold;
        if (typeof seatMapColorSold === 'string') {
            // Remove # if present and convert to hex format
            const hexString = seatMapColorSoldRaw.replace('#', '');
            seatMapColorSoldRaw = parseInt('0x' + hexString, 16);
        } else if (typeof seatMapColorSold === 'number') {
            seatMapColorSoldRaw = seatMapColorSold;
        }

        const seatMapColorSoldElement = document.getElementById('SeatMapColorSold');
        seatMapColorSoldElement.style.borderColor = window.seatmapApp.darkenColorToRGB(seatMapColorSoldRaw, 0.5);

        for (const priceGroup of priceGroups) {
            const indexItem = document.createElement('div');
            let fillColor = priceGroup.Color;
            if (typeof priceGroup.Color === 'string') {
                // Remove # if present and convert to hex format
                const hexString = priceGroup.Color.replace('#', '');
                fillColor = parseInt('0x' + hexString, 16);
            } else if (typeof priceGroup.Color === 'number') {
                fillColor = priceGroup.Color;
            }
            const darkColor = window.seatmapApp.darkenColorToRGB(fillColor, 0.5);
            
            indexItem.className = 'IndexItemClickable';
            indexItem.innerHTML = `
                <div class="IndexColor" style="background-color: ${priceGroup.Color}; border: 2px solid ${darkColor};"></div>
                <div class="IndexName">${priceGroup.Name}</div>
            `;
            this.indexContainer.appendChild(indexItem);

            indexItem.addEventListener('click', () => {
                if (this.selectedItemIndex != indexItem && this.selectedItemIndex != null) {
                    this.selectedItemIndex.classList.remove('selected');
                }
                this.selectedItemIndex = indexItem;
                indexItem.classList.toggle('selected');

                window.seatmapApp.filterByPriceGroup(priceGroup);
            });

            this.indexItems.push(indexItem);
        }

        this.indexContainerHeight = $("#IndexContainer").height();
        this.indexContainer.classList.toggle('show');
        this.indexHeader.addEventListener('click', () => {
            this.toggleIndex();
        });
    }

    toggleIndex() {
        this.indexContainer.classList.toggle('show');
        this.indexHeader.classList.toggle('show');
        this.seatIndex.classList.toggle('show');

        if (this.seatIndex.classList.contains('show')) {
            this.seatIndex.style.height = (this.indexContainerHeight + 52) + "px";
            this.seatIndex.style.bottom = `${this.indexContainerHeight + 72}px`;
        } else {
            this.seatIndex.style.height = "37px";
            this.seatIndex.style.bottom = "57px";
        }
    }

    cleanup() {
        this.indexContainer = null;
        this.indexItems = [];
        this.priceGroupsDictionary = {};
        this.priceGroups = [];
    }
}
