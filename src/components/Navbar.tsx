import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "1rem 2rem",
        background: "linear-gradient(90deg, #fff7f3 0%, #ffe7e0 100%)",
        color: "#3b2a28",
        width: "100%",
        boxShadow: "0 2px 12px rgba(226,91,69,0.15)",
        borderBottom: "1px solid #ffd4c9",
        fontFamily: "Rubik, sans-serif",
      }}
    >
      {[
        { to: "/fortune", label: "Cookies" },
        { to: "/chat", label: "Chat" },
      ].map((item) => (
        <Link
          key={item.to}
          to={item.to}
          style={{
            color: "#d6523a",
            textDecoration: "none",
            fontWeight: 500,
            fontSize: "1.1rem",
            padding: "0.4rem 0.8rem",
            borderRadius: 8,
            transition: "all 0.25s ease",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#ffe9e2")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}