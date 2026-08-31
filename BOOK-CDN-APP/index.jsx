// ============ CART STATE ============
let cartCount = 0;
let cartItems = [];

// ============ COMPONENTS ============

function Header() {
  return <h1 style={{ textAlign: "center", color: "#2c3e50", marginBottom: "5px" }}>📚 Book Store</h1>;
}

function CartBar() {
  return <h2 style={{ textAlign: "center", color: "#27ae60", marginBottom: "20px" }}>🛒 Cart: {cartCount} items</h2>;
}

function BookCard({ book }) {
  function handleAddToCart() {
    cartCount++;
    cartItems.push(book);
    alert(`✅ ${book.title} added to Cart! Total items: ${cartCount}`);
    renderApp();
  }

  return (
    <div className="card">
      <img src={book.image} width="150px" height="150px" alt={book.title} />
      <h2 style={{ color: "#e74c3c", margin: "10px 0 5px" }}>{book.title}</h2>
      <h3 style={{ color: "#2980b9", margin: "5px 0" }}>₹ {book.price}/-</h3>
      <button onClick={handleAddToCart}>Add To Cart</button>
    </div>
  );
}

function BookContainer() {
  return (
    <div className="book-container">
      {bookData.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}

function App() {
  return (
    <div>
      <Header />
      <CartBar />
      <BookContainer />
    </div>
  );
}

// ============ RENDER ============
function renderApp() {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
}

renderApp();
