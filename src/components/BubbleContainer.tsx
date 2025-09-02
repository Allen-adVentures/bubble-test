'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  velocityY: number;
  velocityX: number;
  opacity: number;
  color: string;
  originalSize: number;
  isStacked: boolean;
  isFadingOut: boolean;
  lastMoveTime: number;
  lastPosition: { x: number; y: number };
  name: string;
  description: string;
}

// Object pool for better memory management
class BubblePool {
  private pool: Bubble[] = [];
  private activeCount = 0;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(): Bubble | null {
    if (this.pool.length > 0) {
      this.activeCount++;
      return this.pool.pop()!;
    }
    return null;
  }

  release(bubble: Bubble): void {
    if (this.activeCount > 0) {
      this.activeCount--;
    }
    if (this.pool.length < this.maxSize) {
      this.pool.push(bubble);
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}

const BubbleContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const [renderBubbles, setRenderBubbles] = useState<Bubble[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);
  const lastBubbleId = useRef<number>(0);

  // Performance optimizations
  const bubblePool = useMemo(() => new BubblePool(100), []);
  const frameCount = useRef(0);
  const lastRenderTime = useRef(0);
  const RENDER_THROTTLE = 16; // ~60fps

  // Generate random colors for bubbles
  const colors = [
    'rgba(255, 182, 193, 0.8)',   // Light pink
    'rgba(173, 216, 230, 0.8)',   // Light blue
    'rgba(144, 238, 144, 0.8)',   // Light green
    'rgba(255, 218, 185, 0.8)',   // Peach
    'rgba(221, 160, 221, 0.8)',   // Plum
    'rgba(176, 196, 222, 0.8)',   // Light steel blue
    'rgba(255, 255, 224, 0.8)',   // Light yellow
    'rgba(240, 248, 255, 0.8)',   // Alice blue
    'rgba(255, 192, 203, 0.8)',   // Pink
    'rgba(135, 206, 235, 0.8)',   // Sky blue
  ];

  // Random names for bubbles
  const names = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
    'Iris', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul',
    'Quinn', 'Ruby', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xander',
    'Yara', 'Zoe', 'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley'
  ];

  // Random descriptions for bubbles
  const descriptions = [
    'Floating dreamer', 'Ocean explorer', 'Sky wanderer', 'Cloud dancer',
    'Wind whisperer', 'Light seeker', 'Hope carrier', 'Joy bringer',
    'Peace keeper', 'Love holder', 'Dream maker', 'Star follower',
    'Moon child', 'Sun seeker', 'Rainbow rider', 'Storm chaser',
    'Wave rider', 'Mountain climber', 'Forest walker', 'River runner',
    'Desert wanderer', 'Arctic explorer', 'Tropical dreamer', 'Cosmic traveler'
  ];

  // Initialize container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
        setContainerWidth(rect.width);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Create new bubbles with object pooling
  const createBubble = useCallback(() => {
    if (!containerWidth) return;

    // Try to get from pool first
    let newBubble = bubblePool.get();

    if (!newBubble) {
      // Create new bubble if pool is empty
      newBubble = {
        id: ++lastBubbleId.current,
        x: 0,
        y: 0,
        size: 100,
        velocityY: 0,
        velocityX: 0,
        opacity: 0.6,
        color: colors[0],
        originalSize: 100,
        isStacked: false,
        isFadingOut: false,
        lastMoveTime: 0,
        lastPosition: { x: 0, y: 0 },
        name: names[0],
        description: descriptions[0],
      };
    }

    // Initialize bubble properties
    newBubble.x = Math.random() * containerWidth;
    newBubble.y = containerHeight + 50;
    newBubble.velocityY = -(Math.random() * 0.8 + 0.4);
    newBubble.velocityX = (Math.random() - 0.5) * 0.8;
    newBubble.opacity = Math.random() * 0.4 + 0.6;
    newBubble.color = colors[Math.floor(Math.random() * colors.length)];
    newBubble.name = names[Math.floor(Math.random() * names.length)];
    newBubble.description = descriptions[Math.floor(Math.random() * descriptions.length)];
    newBubble.isStacked = false;
    newBubble.isFadingOut = false;
    newBubble.lastMoveTime = Date.now();
    newBubble.lastPosition = { x: newBubble.x, y: newBubble.y };

    bubblesRef.current = [...bubblesRef.current, newBubble];
  }, [containerWidth, containerHeight, bubblePool]);

  // Optimized collision detection with spatial partitioning
  const checkCollision = useCallback((bubble1: Bubble, bubble2: Bubble) => {
    // Quick distance check without square root
    const dx = bubble1.x - bubble2.x;
    const dy = bubble1.y - bubble2.y;
    const minDistance = (bubble1.size + bubble2.size) / 2;
    return (dx * dx + dy * dy) < (minDistance * minDistance);
  }, []);

  // Spatial partitioning for better collision detection performance
  const getNearbyBubbles = useCallback((bubble: Bubble, allBubbles: Bubble[]) => {
    const nearby: Bubble[] = [];
    const searchRadius = bubble.size * 2;

    for (const other of allBubbles) {
      if (other.id === bubble.id) continue;

      const dx = Math.abs(bubble.x - other.x);
      const dy = Math.abs(bubble.y - other.y);

      if (dx < searchRadius && dy < searchRadius) {
        nearby.push(other);
      }
    }

    return nearby;
  }, []);

    // Handle bubble stacking and collision
  const handleBubblePhysics = (bubble: Bubble, allBubbles: Bubble[]) => {
    // Handle fading out bubbles
    if (bubble.isFadingOut) {
      // Gradually reduce opacity and size
      const newOpacity = bubble.opacity * 0.95; // Reduce opacity by 5% each frame
      const newSize = bubble.size * 0.98; // Reduce size by 2% each frame
      let newY = bubble.y + bubble.velocityY;
      let newX = bubble.x + bubble.velocityX;

      // Remove bubble when it's almost transparent or very small
      if (newOpacity < 0.05 || newSize < 10) {
        bubblePool.release(bubble);
        return null;
      }

      return {
        ...bubble,
        x: newX,
        y: newY,
        size: newSize,
        opacity: newOpacity,
        lastMoveTime: Date.now(),
        lastPosition: { x: newX, y: newY },
      };
    }

    // Normal bubble physics for non-fading bubbles
    let newY = bubble.y + bubble.velocityY;
    let newX = bubble.x + bubble.velocityX;
    const newSize = bubble.size;
    let newVelocityY = bubble.velocityY;
    let newVelocityX = bubble.velocityX;
    let isStacked = bubble.isStacked;

    // Bounce off walls with some energy loss
    if (newX <= bubble.size / 2) {
      newX = bubble.size / 2;
      newVelocityX = Math.abs(newVelocityX) * 0.8;
    } else if (newX >= containerWidth - bubble.size / 2) {
      newX = containerWidth - bubble.size / 2;
      newVelocityX = -Math.abs(newVelocityX) * 0.8;
    }

    // Handle bubbles reaching the top - start fade out instead of stacking
    if (newY <= bubble.size / 2) {
      newY = bubble.size / 2;
      // Allow a slight upward movement to continue the fade-out effect
      newVelocityY = -0.1;
      // Start fade-out process instead of stacking
      return {
        ...bubble,
        x: newX,
        y: newY,
        velocityY: newVelocityY,
        velocityX: newVelocityX,
        isFadingOut: true,
        lastMoveTime: Date.now(),
        lastPosition: { x: newX, y: newY },
      };
    }

    // Check collisions with nearby bubbles only (spatial partitioning)
    let collisionCount = 0;
    const nearbyBubbles = getNearbyBubbles(bubble, allBubbles);

    for (const otherBubble of nearbyBubbles) {
      if (checkCollision({ ...bubble, x: newX, y: newY }, otherBubble)) {
        collisionCount++;

        // Improved collision response - push away more aggressively
        const dx = newX - otherBubble.x;
        const dy = newY - otherBubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const pushDistance = (bubble.size + otherBubble.size) / 2 - distance + 2; // Reduced from 5 to 2
          const pushX = (dx / distance) * pushDistance;
          const pushY = (dy / distance) * pushDistance;

          newX += pushX;
          newY += pushY;

          // Bounce effect with more energy
          newVelocityX *= 0.98; // Increased from 0.95 to 0.98 for smoother movement
          newVelocityY *= 0.98; // Increased from 0.95 to 0.98 for smoother movement
        }
      }
    }

    // Prevent bubbles from getting stuck by adding small random movement
    if (collisionCount > 0 || (Math.abs(newVelocityY) < 0.1 && !isStacked && !bubble.isFadingOut)) {
      // Add small random movement to unstuck bubbles (reduced frequency)
      if (Math.random() < 0.1) { // Only 10% chance per frame
        newVelocityX += (Math.random() - 0.5) * 0.1; // Reduced magnitude
        newVelocityY += (Math.random() - 0.5) * 0.1; // Reduced magnitude
      }

      // Ensure minimum upward movement for non-stacked and non-fading bubbles
      if (!isStacked && !bubble.isFadingOut && newVelocityY > -0.2) {
        newVelocityY = -0.2;
      }
    }

    // Check if bubble is stuck (hasn't moved much in a while)
    const currentTime = Date.now();
    const timeSinceLastMove = currentTime - bubble.lastMoveTime;
    const distanceMoved = Math.sqrt(
      Math.pow(newX - bubble.lastPosition.x, 2) +
      Math.pow(newY - bubble.lastPosition.y, 2)
    );

    // If bubble hasn't moved much in 3 seconds, give it a boost (increased from 2s to 3s)
    // Don't boost bubbles that are fading out
    if (timeSinceLastMove > 3000 && distanceMoved < 10 && !isStacked && !bubble.isFadingOut) {
      newVelocityY = -0.8; // Reduced boost strength from -1.0 to -0.8
      newVelocityX += (Math.random() - 0.5) * 0.5; // Reduced random boost from 1.0 to 0.5
    }

    // We no longer need to add natural movement for stacked bubbles
    // since bubbles now fade out instead of stacking

    // Remove bubbles that are too small or off-screen (but not those that are fading out)
    if ((bubble.size < 30 || newY < -100) && !bubble.isFadingOut) {
      // Return bubble to pool before removing
      bubblePool.release(bubble);
      return null;
    }

    // Smooth velocity changes to reduce jitter
    const smoothedVelocityX = bubble.velocityX * 0.9 + newVelocityX * 0.1;
    const smoothedVelocityY = bubble.velocityY * 0.9 + newVelocityY * 0.1;

    return {
      ...bubble,
      x: newX,
      y: newY,
      size: newSize,
      velocityY: smoothedVelocityY,
      velocityX: smoothedVelocityX,
      isStacked,
      isFadingOut: bubble.isFadingOut, // Preserve the fading out state
      lastMoveTime: currentTime,
      lastPosition: { x: newX, y: newY },
    };
  };

  // Animation loop
  const animate = () => {
    const currentBubbles = bubblesRef.current;
    const updatedBubbles = currentBubbles.map(bubble =>
      handleBubblePhysics(bubble, currentBubbles)
    ).filter(Boolean) as Bubble[];

    bubblesRef.current = updatedBubbles;

    // Throttle rendering for better performance
    frameCount.current++;
    const currentTime = performance.now();
    if (currentTime - lastRenderTime.current >= RENDER_THROTTLE) {
      setRenderBubbles([...updatedBubbles]);
      lastRenderTime.current = currentTime;
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  // Start animation
  useEffect(() => {
    if (containerHeight > 0) {
      animate();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up all bubbles and return them to pool
      bubblesRef.current.forEach(bubble => bubblePool.release(bubble));
      bubblesRef.current = [];
      setRenderBubbles([]);
    };
  }, [containerHeight, bubblePool]);

  // Create new bubbles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (bubblesRef.current.length < 60) { // Limit total bubbles
        createBubble();
      }
    }, 800); // Slightly faster bubble creation

    return () => clearInterval(interval);
  }, [containerWidth]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black"
      style={{ minHeight: '100vh' }}
    >
      {/* Bubble Counter */}
      <div className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-white font-mono text-sm">
        Bubbles: {renderBubbles.length}
      </div>

      {renderBubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute rounded-full flex flex-col items-center justify-center text-center"
          style={{
            left: `${bubble.x}px`,
            top: `${bubble.y}px`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color,
            opacity: bubble.opacity,
            transform: `translate(-50%, -50%)`,
            transition: bubble.isFadingOut ? 'all 0.5s ease-out' : 'all 0.1s ease-out',
            boxShadow: `0 0 ${bubble.size * 0.4}px ${bubble.color}, inset 0 0 ${bubble.size * 0.1}px rgba(255, 255, 255, 0.3)`,
            filter: bubble.isFadingOut ? 'brightness(1.2)' : 'brightness(1)',
          }}
        >
          <div className="text-white font-bold text-xs leading-tight px-2">
            {bubble.name}
          </div>
          <div className="text-white/80 text-xs leading-tight px-2 -mt-1">
            {bubble.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BubbleContainer;
