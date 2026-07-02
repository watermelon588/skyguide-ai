import React from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-transparent text-white">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto h-[85vh] grid grid-cols-2 items-center px-12">
        {/* Left Side */}
        <div className="space-y-8">
          <h1 className="text-5xl font-extrabold leading-tight">
            Discover the
            <br />
            Universe
            <br />
            One Night at
            <br />a Time.
          </h1>

          <p className="max-w-lg text-gray-300 text-lg leading-relaxed">
            Your intelligent astronomy companion that recommends the best
            celestial objects to observe based on your location, telescope,
            weather conditions, and the current night sky.
          </p>
          <div className="flex gap-5">
            <button
              className="
              px-7
              py-2
              rounded-xl
              border
              border-white/50
              bg-white/10
              backdrop-blur-md
              hover:bg-white/20
              transition
              font-semibold
            "
              onClick={() => navigate("/login")}
            >
              Get Started
            </button>
            <button
              className="
              px-7
              py-2
              rounded-xl
              border
              border-white/50
              bg-white/10
              backdrop-blur-md
              hover:bg-white/20
              transition
              font-semibold
            "
              onClick={() => navigate("/about")}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Right Side */}
        <div></div>
      </section>
    </div>
  );
}
