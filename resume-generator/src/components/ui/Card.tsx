"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * カードコンポーネント
 */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-[#dfe3eb] shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * カードヘッダーコンポーネント
 */
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("p-6 border-b border-[#dfe3eb]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

/**
 * カードタイトルコンポーネント
 */
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-lg font-semibold text-[#33475b]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * カードコンテンツコンポーネント
 */
export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * カードフッターコンポーネント
 */
export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        "p-6 border-t border-[#dfe3eb] flex items-center gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}









