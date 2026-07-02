import React from "react";

export const Navbar = () => {
  return (
    <div>
      <nav className="w-full flex items-center justify-between px-12 py-6">
        <h1 className="text-2xl font-bold tracking-wide">SkyGuide AI</h1>

        <ul className="flex items-center gap-10 text-sm font-medium">
          <li
            className="cursor-pointer hover:text-gray-300 transition"
            onClick={() => navigate("/")}
          >
            Home
          </li>
          <li
            className="cursor-pointer hover:text-gray-300 transition"
            onClick={() => navigate("/features")}
          >
            Features
          </li>
          <li
            className="cursor-pointer hover:text-gray-300 transition"
            onClick={() => navigate("/about")}
          >
            About
          </li>
        </ul>
      </nav>
    </div>
  );
};
