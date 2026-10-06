import { Cartesian2, Color, DistanceDisplayCondition, HeightReference, HorizontalOrigin, LabelStyle, NearFarScalar, VerticalOrigin, type Entity } from 'cesium'
import type { GeoEntity } from '../core/types'

/** Shared look for point entities clamped to terrain. */
export function groundBillboard(image: string, opts: { scale?: number; maxDistance?: number } = {}): Entity.ConstructorOptions['billboard'] {
  return {
    image,
    scale: opts.scale ?? 0.85,
    verticalOrigin: VerticalOrigin.BOTTOM,
    heightReference: HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    scaleByDistance: new NearFarScalar(2_000, 1.1, 120_000, 0.55),
    distanceDisplayCondition: opts.maxDistance ? new DistanceDisplayCondition(0, opts.maxDistance) : undefined,
  }
}

export function groundLabel(text: string, opts: { maxDistance?: number; color?: string } = {}): Entity.ConstructorOptions['label'] {
  return {
    text,
    font: '600 12px Inter, system-ui, sans-serif',
    fillColor: Color.fromCssColorString(opts.color ?? '#e6edf3'),
    outlineColor: Color.fromCssColorString('#05070a'),
    outlineWidth: 3,
    style: LabelStyle.FILL_AND_OUTLINE,
    horizontalOrigin: HorizontalOrigin.LEFT,
    verticalOrigin: VerticalOrigin.BOTTOM,
    pixelOffset: new Cartesian2(14, -12),
    heightReference: HeightReference.CLAMP_TO_GROUND,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(0, opts.maxDistance ?? 12_000),
  }
}

export const lonLat = (e: GeoEntity) => [e.position.longitude, e.position.latitude] as const
