class SeatmapHeader {
    constructor() {
        this.headerContainer = null;
        this.headerImage = null;
        this.headerText = null;
        this.title = null;
        this.venue = null;
        this.timedate = null;
        this.closeButton = null;
        
        this.init();
    }

    init() {
        
        this.headerContainer = document.getElementById('SeatMapHeader');
        this.headerText = document.getElementById('HeaderText');;
        this.closeButton = document.getElementById('HeaderClose');

        this.closeButton.addEventListener('click', () => {
            CloseSeatMap();
            RefreshTicketSelect();
        });
    }
}
