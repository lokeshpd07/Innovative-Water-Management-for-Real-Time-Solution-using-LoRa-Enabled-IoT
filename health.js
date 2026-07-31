export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok',
    service: 'AquaSense IMS Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
 