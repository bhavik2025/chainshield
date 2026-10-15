import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { STATUS_CONFIG, MODE_CONFIG } from '../data/mockData'

export default function MapView({ height = '100%' }) {
  const mapRef      = useRef(null)
  const instanceRef = useRef(null)
  const layersRef   = useRef([])
  const { filteredShipments, disruptions, selectedShipment, selectShipment } = useApp()

  // Init map once
  useEffect(() => {
    if (!window.L || instanceRef.current) return
    const L = window.L
    const map = L.map(mapRef.current, {
      center: [20, 15], zoom: 2,
      zoomControl: true,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map)
    instanceRef.current = map

    return () => {
      map.remove()
      instanceRef.current = null
    }
  }, [])

  // Redraw layers on data change
  useEffect(() => {
    const L = window.L
    const map = instanceRef.current
    if (!L || !map) return

    layersRef.current.forEach(l => { try { map.removeLayer(l) } catch {} })
    layersRef.current = []

    const add = l => { l.addTo(map); layersRef.current.push(l) }

    // Disruption zones
    disruptions.forEach(dis => {
      const color = dis.severity === 'critical' ? '#dc2626'
        : dis.severity === 'high'   ? '#ea580c'
        : dis.severity === 'medium' ? '#d97706' : '#2563eb'

      const zone = L.circle([dis.location.lat, dis.location.lng], {
        radius: dis.severity === 'critical' ? 450000 : 300000,
        color, weight: 1.5,
        fillColor: color, fillOpacity: 0.1,
        dashArray: '5 4',
      })
      zone.bindPopup(makeDisruptionPopup(dis), { className: 'cs-popup' })
      add(zone)

      const pulseIcon = L.divIcon({
        html: `<div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${color}30;border:2px solid ${color};animation:pulse 1.5s ease-in-out infinite;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;border-radius:50%;background:${color};"></div>
        </div>`,
        className: '', iconAnchor: [11, 11],
      })
      add(L.marker([dis.location.lat, dis.location.lng], { icon: pulseIcon })
        .bindPopup(makeDisruptionPopup(dis), { className: 'cs-popup' }))
    })

    // Shipment routes and markers
    filteredShipments.forEach(ship => {
      const isSelected = selectedShipment?.id === ship.id
      const statusColor = STATUS_CONFIG[ship.status]?.dot || '#2563eb'
      const modeIcon    = MODE_CONFIG[ship.mode]?.icon || '📦'
      const pts = ship.waypoints.map(w => [w.lat, w.lng])

      // Route line
      const line = L.polyline(pts, {
        color: isSelected ? '#2563eb' : statusColor,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 0.9 : 0.4,
        dashArray: ship.mode === 'air' ? '8 5' : ship.mode === 'rail' ? '4 4' : null,
      })
      add(line)

      // Marker at current position
      const markerHtml = `
        <div style="
          width:${isSelected ? 38 : 30}px;
          height:${isSelected ? 38 : 30}px;
          background:${isSelected ? '#2563eb' : '#fff'};
          border:2.5px solid ${statusColor};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${isSelected ? 16 : 13}px;
          box-shadow:0 2px 8px ${statusColor}44;
          cursor:pointer;
          transition:all 0.2s;
        ">${modeIcon}</div>`

      const icon = L.divIcon({ html: markerHtml, className: '', iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15] })
      const marker = L.marker([ship.currentPos.lat, ship.currentPos.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 })
      marker.bindPopup(makeShipmentPopup(ship), { className: 'cs-popup' })
      marker.on('click', () => selectShipment(ship))
      add(marker)
    })

  }, [filteredShipments, disruptions, selectedShipment])

  return (
    <>
      <style>{`
        .cs-popup .leaflet-popup-content-wrapper {
          padding: 0; border: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border-radius: 10px; overflow: hidden;
        }
        .cs-popup .leaflet-popup-content { margin: 0; }
        @keyframes pulse {
          0%,100% { transform:scale(1); opacity:0.9; }
          50%      { transform:scale(1.6); opacity:0.25; }
        }
        .leaflet-control-zoom { border: 1px solid #e2e8f0 !important; }
        .leaflet-control-zoom a { color: #475569 !important; }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height }} />
    </>
  )
}

function makeShipmentPopup(ship) {
  const statusCfg = STATUS_CONFIG[ship.status]
  const modeCfg   = MODE_CONFIG[ship.mode]
  return `
    <div style="padding:12px 14px;min-width:200px;font-family:Inter,sans-serif;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:18px">${modeCfg.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;">${ship.id}</div>
          <div style="font-size:11px;color:#64748b;">${ship.name}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569;">
        <div>📍 ${ship.origin.city} → ${ship.destination.city}</div>
        <div>🗓 ETA: <strong>${ship.eta}</strong></div>
        <div>📦 ${ship.cargo}</div>
      </div>
      <div style="margin-top:8px;">
        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${statusCfg.dot}18;color:${statusCfg.dot};">
          ● ${statusCfg.label}
        </span>
      </div>
    </div>`
}

function makeDisruptionPopup(dis) {
  const color = dis.severity === 'critical' ? '#dc2626' : dis.severity === 'high' ? '#ea580c' : '#d97706'
  return `
    <div style="padding:12px 14px;min-width:210px;font-family:Inter,sans-serif;">
      <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:4px;">${dis.title}</div>
      <div style="font-size:11px;color:#64748b;line-height:1.45;margin-bottom:8px;">${dis.description.substring(0, 90)}…</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;background:${color}18;color:${color};">${dis.severity.toUpperCase()}</span>
        <span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;background:#f1f5f9;color:#64748b;">+${dis.estimatedDelayHours}h delay</span>
      </div>
    </div>`
}
