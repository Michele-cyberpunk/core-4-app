import React, { useState, useRef, useEffect } from 'react';
import { VisualOutput, Point2D, Box2D, SegmentationMask } from '../types';

/**
 * Overlay data structures for rendering visual annotations on images.
 * Supports bounding boxes, points, labels, and segmentation masks.
 */
export interface OverlayAnnotation {
  type: 'box' | 'point' | 'label' | 'mask';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  confidence?: number;
  color?: string;
  maskData?: string; // base64 encoded PNG for masks
}

export interface VisualOverlayProps {
  visualOutput: VisualOutput;
  imageRef: React.RefObject<HTMLImageElement>;
  baseWidth?: number; // Expected base width for coordinate scaling
  baseHeight?: number; // Expected base height for coordinate scaling
}

/**
 * VisualOverlay - Advanced SVG overlay component for AI vision outputs
 *
 * Features:
 * - Real-time bounding box rendering with labels
 * - Point annotations with animated highlights
 * - Segmentation mask overlays with transparency
 * - Auto-scaling based on actual image dimensions
 * - Responsive to window resize events
 *
 * @example
 * ```tsx
 * const imageRef = useRef<HTMLImageElement>(null);
 * const visualOutput: VisualOutput = [
 *   { box_2d: [100, 100, 300, 300], label: "Person" },
 *   { point_2d: [200, 200] }
 * ];
 *
 * <img ref={imageRef} src="..." />
 * <VisualOverlay visualOutput={visualOutput} imageRef={imageRef} />
 * ```
 */
const VisualOverlay: React.FC<VisualOverlayProps> = ({
  visualOutput,
  imageRef,
  baseWidth = 1000,
  baseHeight = 1000
}) => {
    const [imgRect, setImgRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const updateRect = () => {
            if (imageRef.current) {
                const rect = imageRef.current.getBoundingClientRect();
                setImgRect(rect);
            }
        };

        const imageEl = imageRef.current;

        // Handle image load event
        const handleLoad = () => {
            updateRect();
        };

        if (imageEl) {
            imageEl.addEventListener('load', handleLoad);

            // If image is already loaded, update immediately
            if (imageEl.complete) {
                updateRect();
            }
        }

        // Handle window resize
        window.addEventListener('resize', updateRect);

        return () => {
            imageEl?.removeEventListener('load', handleLoad);
            window.removeEventListener('resize', updateRect);
        };
    }, [imageRef]);

    // Guard: don't render if prerequisites not met
    if (!visualOutput || !imgRect || !imageRef.current || imgRect.width === 0) {
        return null;
    }

    // Calculate scaling factors from base coordinates to actual image display size
    const scaleX = imgRect.width / baseWidth;
    const scaleY = imgRect.height / baseHeight;

    /**
     * Type guard to check if item is a Point2D
     */
    const isPoint2D = (item: Point2D | Box2D | SegmentationMask): item is Point2D => {
        return 'point_2d' in item;
    };

    /**
     * Type guard to check if item is a Box2D or SegmentationMask
     */
    const isBox2D = (item: Point2D | Box2D | SegmentationMask): item is Box2D | SegmentationMask => {
        return 'box_2d' in item;
    };

    /**
     * Type guard to check if item has segmentation mask
     */
    const hasSegmentationMask = (item: Point2D | Box2D | SegmentationMask): item is SegmentationMask => {
        return 'mask' in item && Boolean(item.mask);
    };

    return (
        <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={imgRect.width}
            height={imgRect.height}
            viewBox={`0 0 ${imgRect.width} ${imgRect.height}`}
            style={{ zIndex: 10 }}
        >
            <defs>
                {/* Gradient for enhanced visual effects */}
                <linearGradient id="boxGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00f6ff', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#00f6ff', stopOpacity: 0.1 }} />
                </linearGradient>

                {/* Drop shadow for labels */}
                <filter id="labelShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="0" dy="1" result="offsetblur" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.8" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {visualOutput.map((item, index) => (
                <g key={`vis-item-${index}`}>
                    {/* Render Point2D as animated circle */}
                    {isPoint2D(item) && (
                        <>
                            {/* Outer pulsing ring */}
                            <circle
                                cx={item.point_2d[0] * scaleX}
                                cy={item.point_2d[1] * scaleY}
                                r="12"
                                fill="none"
                                stroke="#ff00c1"
                                strokeWidth="2"
                                opacity="0.6"
                                className="animate-pulse"
                            />
                            {/* Inner solid point */}
                            <circle
                                cx={item.point_2d[0] * scaleX}
                                cy={item.point_2d[1] * scaleY}
                                r="4"
                                fill="#ff00c1"
                                stroke="#ffffff"
                                strokeWidth="1"
                            />
                        </>
                    )}

                    {/* Render Box2D with optional label and mask */}
                    {isBox2D(item) && (() => {
                        const [x1, y1, x2, y2] = item.box_2d;
                        const rectProps = {
                            x: x1 * scaleX,
                            y: y1 * scaleY,
                            width: (x2 - x1) * scaleX,
                            height: (y2 - y1) * scaleY,
                        };

                        return (
                            <g>
                                {/* Bounding box rectangle */}
                                <rect
                                    {...rectProps}
                                    fill="url(#boxGradient)"
                                    stroke="#00f6ff"
                                    strokeWidth="2"
                                    rx="2"
                                    ry="2"
                                />

                                {/* Corner markers for enhanced visibility */}
                                {[
                                    [rectProps.x, rectProps.y], // top-left
                                    [rectProps.x + rectProps.width, rectProps.y], // top-right
                                    [rectProps.x, rectProps.y + rectProps.height], // bottom-left
                                    [rectProps.x + rectProps.width, rectProps.y + rectProps.height] // bottom-right
                                ].map(([cx, cy], i) => (
                                    <circle
                                        key={`corner-${i}`}
                                        cx={cx}
                                        cy={cy}
                                        r="3"
                                        fill="#00f6ff"
                                        stroke="#ffffff"
                                        strokeWidth="1"
                                    />
                                ))}

                                {/* Label text */}
                                {item.label && (
                                    <g filter="url(#labelShadow)">
                                        {/* Label background */}
                                        <rect
                                            x={rectProps.x}
                                            y={rectProps.y - 22}
                                            width={Math.max(60, item.label.length * 7 + 8)}
                                            height="18"
                                            fill="#00f6ff"
                                            rx="3"
                                            ry="3"
                                            opacity="0.9"
                                        />
                                        {/* Label text */}
                                        <text
                                            x={rectProps.x + 4}
                                            y={rectProps.y - 9}
                                            fill="#0a0a0a"
                                            fontSize="12"
                                            fontWeight="600"
                                            className="font-mono"
                                        >
                                            {item.label}
                                        </text>
                                    </g>
                                )}

                                {/* Segmentation mask overlay */}
                                {hasSegmentationMask(item) && item.mask && (
                                    <image
                                        href={`data:image/png;base64,${item.mask}`}
                                        {...rectProps}
                                        style={{ opacity: 0.5, mixBlendMode: 'multiply' }}
                                        preserveAspectRatio="none"
                                    />
                                )}
                            </g>
                        );
                    })()}
                </g>
            ))}
        </svg>
    );
};

export default VisualOverlay;
