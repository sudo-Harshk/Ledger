import React, { useState } from 'react';

interface FlippableCardProps {
  className?: string;
  style?: React.CSSProperties;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  flipDuration?: number;
  enableMouseTracking?: boolean;
  enableHoverScale?: boolean;
}

const FlippableCard: React.FC<FlippableCardProps> = ({ 
  className = '', 
  style = {}, 
  frontContent, 
  backContent,
  flipDuration = 0.8,
  enableMouseTracking = true,
  enableHoverScale = true
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);

  // Use requestAnimationFrame for smoother animations
  React.useEffect(() => {
    if (!enableMouseTracking) return;
    
    let animationId: number;
    
    const animate = () => {
      setRotateX(prev => {
        const diff = rotateX - prev;
        return prev + diff * 0.15; // Smooth interpolation factor
      });
      setRotateY(prev => {
        const diff = rotateY - prev;
        return prev + diff * 0.15;
      });
      setScale(prev => {
        const target = (isHovering && enableHoverScale) ? 1.03 : 1;
        const diff = target - prev;
        return prev + diff * 0.2;
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [rotateX, rotateY, isHovering, enableMouseTracking, enableHoverScale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableMouseTracking) return;
    
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation with smoother curve and reduced intensity during flip
    const intensity = isFlipped ? 4 : 6; // Reduce tracking intensity during flip
    const rotateYValue = (mouseX / (rect.width / 2)) * intensity;
    const rotateXValue = -(mouseY / (rect.height / 2)) * intensity;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    if (!enableMouseTracking) return;
    
    setRotateX(0);
    setRotateY(0);
    setIsHovering(false);
  };

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div 
      className={`${className} cursor-pointer relative group`}
      style={{
        ...style,
        transform: enableMouseTracking 
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`
          : 'perspective(1000px)',
        transformStyle: 'preserve-3d',
        boxShadow: isHovering 
          ? '0 12px 40px 0 rgba(158,42,43,0.25)' 
          : '0 4px 16px 0 rgba(158,42,43,0.1)',
        willChange: 'transform',
        transition: 'box-shadow 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        WebkitTransformStyle: 'preserve-3d',
        WebkitPerspective: '1000px',
        overflow: 'hidden',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Click to flip card"
    >
      {/* Front Face */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          MozBackfaceVisibility: 'hidden',
          transition: `transform ${flipDuration}s cubic-bezier(0.4, 0.0, 0.2, 1)`,
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        } as React.CSSProperties}
      >
        {frontContent}
      </div>
      
      {/* Back Face */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          MozBackfaceVisibility: 'hidden',
          transition: `transform ${flipDuration}s cubic-bezier(0.4, 0.0, 0.2, 1)`,
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        } as React.CSSProperties}
      >
        {backContent}
      </div>
    </div>
  );
};

export default FlippableCard;
