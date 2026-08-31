// ============ CART STATE ============
var cartCount = 0;

// ============ COMPONENTS ============

function Header() {
    return React.createElement("h1", {
        style: { textAlign: "center", color: "#2c3e50", marginBottom: "5px" }
    }, "\uD83D\uDCDA Book Store");
}

function CartBar() {
    return React.createElement("h2", {
        style: { textAlign: "center", color: "#27ae60", marginBottom: "20px" }
    }, "\uD83D\uDED2 Cart: " + cartCount + " items");
}

function BookCard(props) {
    var book = props.book;

    var image = React.createElement("img", {
        src: book.image,
        width: "150px",
        height: "150px",
        alt: book.title
    }, null);

    var title = React.createElement("h2", {
        style: { color: "#e74c3c", margin: "10px 0 5px" }
    }, book.title);

    var price = React.createElement("h3", {
        style: { color: "#2980b9", margin: "5px 0" }
    }, "\u20B9 " + book.price + "/-");

    var btn = React.createElement("button", {
        onClick: function () {
            cartCount++;
            alert("\u2705 " + book.title + " added to Cart! Total items: " + cartCount);
            renderApp();
        }
    }, "Add To Cart");

    return React.createElement("div", { className: "card" }, [image, title, price, btn]);
}

function BookContainer() {
    var cards = bookData.map(function (book) {
        return React.createElement(BookCard, { key: book.id, book: book });
    });

    return React.createElement("div", { className: "book-container" }, cards);
}

function App() {
    return React.createElement("div", null, [
        React.createElement(Header, { key: "header" }),
        React.createElement(CartBar, { key: "cart" }),
        React.createElement(BookContainer, { key: "books" })
    ]);
}

// ============ RENDER ============
function renderApp() {
    var parent = document.getElementById("root");
    var root = ReactDOM.createRoot(parent);
    root.render(React.createElement(App, null));
}

renderApp();
