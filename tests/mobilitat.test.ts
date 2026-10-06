import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  classifyIncident,
  normalizeCameras,
  normalizeIncidents,
  normalizePoints,
  parseCapacity,
  parseLocalDate,
  safeCameraUrl,
  splitCameraTitle,
  stripHtml,
} from '../src/providers/mobilitat'

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

describe('Mobilitat incidents', () => {
  it('normalizes incidents with coordinates and timestamps', () => {
    const { entities, withoutLocation } = normalizeIncidents(fixture('mobilitat_incidents_ca.json'))
    expect(entities.length).toBe(6)
    expect(withoutLocation).toEqual([])
    for (const e of entities) {
      expect(['trafficIncident', 'roadClosure']).toContain(e.type)
      expect(e.id).toMatch(/^mobilitat-incidents:\d+$/)
      expect(e.properties.start).toMatch(/Z$/)
      expect(e.properties.description ?? '').not.toMatch(/<[a-z]/i)
    }
    const works = entities.find((e) => e.properties.incidentId === 992)!
    expect(works.properties.kind).toBe('works')
    expect(works.properties.end).toBeUndefined() // 9999-12-31 = no end date
    expect(works.properties.start).toBe('2025-09-26T08:07:00.000Z') // CEST → UTC
    const cut = entities.find((e) => e.properties.incidentId === 1051)!
    expect(cut.type).toBe('roadClosure')
  })

  it('sends incidents without GPS to withoutLocation', () => {
    const { entities, withoutLocation } = normalizeIncidents({
      result: [
        { id: 1, title: 'Sense GPS', has_gps: false, lat: '0', lng: '0', category: { title: 'Informació' } },
        { id: 2, title: 'Lluny', has_gps: true, lat: '40.4', lng: '-3.7', category: { title: 'Obres' } },
        { id: 3, title: 'Bo', has_gps: true, lat: '42.5', lng: '1.55', category: { title: 'Talls', classification: 'VERMELL' } },
      ],
    })
    expect(entities.map((e) => e.properties.incidentId)).toEqual([3])
    expect(entities[0].type).toBe('roadClosure')
    expect(withoutLocation.map((w) => w.id)).toEqual([1, 2])
  })

  it('classifies categories', () => {
    expect(classifyIncident('Neu', 'Cadenes a la CG2').kind).toBe('snow')
    expect(classifyIncident('Talls', 'CG3').closure).toBe(true)
    expect(classifyIncident('Informació', 'Treballs als Túnels').kind).toBe('info')
  })

  it('parses local dates across DST', () => {
    expect(parseLocalDate('2026-01-19T11:37:00')).toBe('2026-01-19T10:37:00.000Z')
    expect(parseLocalDate('2026-07-01T12:00:00')).toBe('2026-07-01T10:00:00.000Z')
    expect(parseLocalDate('9999-12-31T23:59:59.9999999')).toBeUndefined()
    expect(parseLocalDate('')).toBeUndefined()
  })

  it('strips HTML and decodes entities', () => {
    expect(stripHtml('<p>Punts&nbsp;de c&agrave;rrega: 3</p>  ')).toBe('Punts de càrrega: 3')
    expect(stripHtml('a<br/>b')).toBe('a\nb')
  })
})

describe('Mobilitat cameras', () => {
  it('normalizes the 69 cameras with altitude and allow-listed URLs', () => {
    const cams = normalizeCameras(fixture('mobilitat_cameras.json'))
    expect(cams.length).toBe(69)
    for (const c of cams) {
      expect(c.properties.upstreamUrl).toMatch(/^https:\/\/imgs\.mobilitat\.ad\/prod\/[\w.-]+\.gif$/)
      expect(c.label).not.toMatch(/metres/)
    }
    const nu = cams.find((c) => c.properties.cameraId === 77)!
    expect(nu.properties.altitudeM).toBe(1024)
    expect(nu.properties.zone).toBe('La Massana') // Mobilitat's own grouping (CG3 axis)
  })

  it('splits titles and rejects foreign URLs', () => {
    expect(splitCameraTitle('CG3 / PK 0+441 (Boca sud túnel Pont Pla) / 1.025 metres')).toEqual({ name: 'CG3 / PK 0+441 (Boca sud túnel Pont Pla)', altitudeM: 1025 })
    expect(splitCameraTitle('CG5 / pk 1+450 (Arinsal-Mas Ribafeta) 1445 metres')).toEqual({ name: 'CG5 / pk 1+450 (Arinsal-Mas Ribafeta)', altitudeM: 1445 })
    expect(splitCameraTitle("Av. Consell d'Europa")).toEqual({ name: "Av. Consell d'Europa" })
    expect(safeCameraUrl('https://imgs.mobilitat.ad/prod/X.gif?t=1')).toBe('https://imgs.mobilitat.ad/prod/X.gif')
    expect(safeCameraUrl('https://evil.example/prod/X.gif')).toBeUndefined()
    expect(safeCameraUrl('http://imgs.mobilitat.ad/prod/X.gif')).toBeUndefined()
    expect(safeCameraUrl('https://imgs.mobilitat.ad/../x.gif')).toBeUndefined()
  })
})

describe('Mobilitat points', () => {
  it('splits car parks and EV chargers', () => {
    const { parkings, chargers } = normalizePoints(fixture('mobilitat_points_ca.json'))
    expect(parkings.length).toBe(71)
    expect(chargers.length).toBe(27)
    expect(parkings.every((p) => p.properties.live === false && p.properties.free === undefined)).toBe(true)
    expect(chargers.every((c) => typeof c.properties.points === 'number')).toBe(true)
    expect(parkings.filter((p) => p.properties.capacity !== undefined).length).toBeGreaterThan(40)
  })

  it('parses capacity text', () => {
    expect(parseCapacity('40 places')).toBe(40)
    expect(parseCapacity("10 places d'autocaravanas i 50 places de cotxes")).toBe(50)
    expect(parseCapacity('15 places + 10 autocaravanes')).toBe(15)
    expect(parseCapacity('6 autobusos')).toBeUndefined()
  })
})
