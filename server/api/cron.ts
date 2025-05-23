export default function handler(req, res) {
  if (
    req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).end('Unauthorized');
  }
  res.end('Hello Cron!');
}
