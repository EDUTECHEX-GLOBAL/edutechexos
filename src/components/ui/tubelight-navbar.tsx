"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  icon: LucideIcon
  action: () => void
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  defaultActive?: string
}

export function NavBar({ items, className, defaultActive }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(defaultActive ?? items[0]?.name)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-1 bg-white/80 border border-slate-200 backdrop-blur-lg py-1 px-1 rounded-full shadow-md">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <button
              key={item.name}
              onClick={() => { setActiveTab(item.name); item.action(); }}
              className={cn(
                "relative cursor-pointer text-xs font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap",
                "text-slate-500 hover:text-slate-900",
                isActive && "text-slate-900",
              )}
            >
              <span className="hidden md:flex items-center gap-1.5">
                <Icon size={14} strokeWidth={2.2} />
                {item.name}
              </span>
              <span className="md:hidden">
                <Icon size={16} strokeWidth={2.5} />
              </span>

              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute inset-0 w-full bg-slate-100 rounded-full -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {/* Lamp glow above active tab */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-indigo-400/30 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-indigo-400/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-indigo-300/30 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
