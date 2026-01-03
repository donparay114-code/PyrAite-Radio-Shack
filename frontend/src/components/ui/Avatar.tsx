"use client";

import { motion } from "framer-motion";
import { cn, getInitials } from "@/lib/utils";
import { UserTier, TIER_COLORS } from "@/types";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  tier?: UserTier;
  showTierBorder?: boolean;
  isOnline?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = "md",
  tier,
  showTierBorder = false,
  isOnline,
  className,
}: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const borderSize = {
    sm: "ring-2",
    md: "ring-2",
    lg: "ring-[3px]",
    xl: "ring-4",
  };

  const tierColor = tier ? TIER_COLORS[tier] : undefined;

  // Generate consistent gradient based on name
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-cyan-500 to-blue-600",
    "from-pink-500 to-rose-600",
    "from-orange-500 to-amber-600",
    "from-emerald-500 to-teal-600",
    "from-indigo-500 to-blue-600",
  ];
  const gradientIndex =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div className={cn("relative inline-flex", className)}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "relative rounded-full overflow-hidden flex items-center justify-center font-medium",
          sizes[size],
          showTierBorder && tier && borderSize[size],
          !src && `bg-gradient-to-br ${gradient}`
        )}
        style={
          showTierBorder && tierColor
            ? { boxShadow: `0 0 0 2px ${tierColor}` }
            : undefined
        }
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover"
            sizes={
              size === "xl"
                ? "80px"
                : size === "lg"
                  ? "56px"
                  : size === "md"
                    ? "40px"
                    : "32px"
            }
          />
        ) : (
          <span className="text-white">{getInitials(name)}</span>
        )}
      </motion.div>

      {/* Online indicator */}
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            size === "sm" && "w-2.5 h-2.5",
            size === "md" && "w-3 h-3",
            size === "lg" && "w-4 h-4",
            size === "xl" && "w-5 h-5",
            isOnline ? "bg-green-500" : "bg-gray-500"
          )}
        />
      )}

      {/* Tier badge for xl avatars */}
      {tier && size === "xl" && (
        <div
          className={cn(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white",
            tier === "new" && "bg-zinc-500",
            tier === "regular" && "bg-green-500",
            tier === "trusted" && "bg-blue-500",
            tier === "vip" && "bg-violet-500",
            tier === "elite" && "bg-amber-500"
          )}
        >
          {tier}
        </div>
      )
      }
    </div >
  );
}

// Avatar group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: "sm" | "md";
}

export function AvatarGroup({ users, max = 4, size = "md" }: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-3">
      {displayed.map((user, i) => (
        <motion.div
          key={i}
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="ring-2 ring-background rounded-full"
        >
          <Avatar src={user.src} name={user.name} size={size} />
        </motion.div>
      ))}

      {remaining > 0 && (
        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: displayed.length * 0.05 }}
          className={cn(
            "rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-text-muted font-medium ring-2 ring-background",
            size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
          )}
        >
          +{remaining}
        </motion.div>
      )}
    </div>
  );
}
