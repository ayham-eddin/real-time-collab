"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

const Home = () => {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white overflow-hidden">
      {/* Floating gradient circle */}
      <div className="absolute top-[-150px] right-[-150px] w-[300px] h-[300px] rounded-full bg-purple-600/30 blur-3xl" />

      {/* Another circle */}
      <div className="absolute bottom-[-150px] left-[-150px] w-[300px] h-[300px] rounded-full bg-blue-500/30 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32">
        <motion.h1
          className="text-4xl sm:text-6xl font-bold mb-6 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Real-Time Collaboration Re-imagined
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-gray-200 max-w-2xl mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          A modern Google-Docs alternative built with Yjs, TipTap and Socket.io.
          Edit documents live with your team — fast, smooth, and elegant.
        </motion.p>

        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <Link href="/auth/login">
            <Button variant="secondary" className="px-6 text-lg">
              Login
            </Button>
          </Link>

          <Link href="/auth/register">
            <Button
              variant="default"
              className="px-6 text-lg bg-white text-black hover:bg-gray-200"
            >
              Get Started
            </Button>
          </Link>
        </motion.div>

        {/* Placeholder hero image */}
        <motion.div
          className="mt-20 max-w-4xl w-full rounded-xl overflow-hidden shadow-2xl mb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <img
            src="https://placehold.co/800x450/1a1a1a/ffffff?text=Your+Collaboration+UI+Preview"
            alt="Preview"
            className="w-full"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
