import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserAlt, FaLock, FaEye, FaEyeSlash, FaPaperPlane } from 'react-icons/fa';

const BASE_URL = "/api/auth"; // Relative path so Vercel handles it via vercel.json

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isLogin ? "/login" : "/register";
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log("Login/Register response:", data); // ✅ Debug response

      if (!res.ok || !data.token) {
        throw new Error(data.message || "Something went wrong");
      }

      localStorage.setItem("token", data.token);
      console.log("Token saved:", localStorage.getItem("token")); // ✅ Confirm token saved

      navigate("/chat");
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
      <motion.form
        className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl w-96"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-white drop-shadow">
          {isLogin ? "Login to ChatVerse" : "Join ChatVerse"}
        </h2>

        <div className="mb-4 relative">
          <FaUserAlt className="absolute top-3 left-3 text-white/70" />
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="w-full p-3 pl-10 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        <div className="mb-6 relative">
          <FaLock className="absolute top-3 left-3 text-white/70" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="w-full p-3 pl-10 pr-10 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-3 right-3 text-white/70 cursor-pointer"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="w-full bg-yellow-300 text-purple-800 font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
          disabled={loading}
        >
          <FaPaperPlane />
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </motion.button>

        {error && <p className="text-red-200 mt-4 text-sm text-center">{error}</p>}

        <p
          className="text-center mt-6 text-sm text-white/80 hover:text-white cursor-pointer"
          onClick={toggleMode}
        >
          {isLogin ? "Create an account" : "Already have an account? Login"}
        </p>
      </motion.form>
    </div>
  );
}
