import { Link } from 'react-router-dom';
import { FaComments, FaRocketchat } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
      
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <div className="flex justify-center mb-4 text-6xl text-white">
          <FaRocketchat className="animate-bounce" />
        </div>
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
          Welcome to <span className="text-yellow-300">ChatVerse</span>
        </h1>
        <p className="text-xl mb-8 text-gray-200 max-w-md mx-auto">
          Connect, chat, and share with your friends in real-time.
        </p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            to="/auth"
            className="bg-white text-purple-600 font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-purple-100 transition-all duration-300"
          >
            Get Started
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 flex gap-4 text-white text-2xl opacity-80"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <FaComments className="animate-pulse" />
        <span>Real-time messaging</span>
      </motion.div>
    </div>
  );
}
