/**
 * DNS helper for MongoDB Atlas SRV resolution.
 *
 * Atlas connections (`mongodb+srv://`) require DNS SRV record resolution,
 * which can fail in corporate/firewall environments where the system's local
 * DNS resolver doesn't support it. This module overrides Node's DNS servers
 * to Google Public DNS (8.8.8.8 / 1.1.1.1) when the current resolvers look
 * like local resolvers — the same pattern used in the mediCore reference project.
 */
import dns from 'node:dns';

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

export function configureDnsForAtlas() {
  const servers = dns.getServers();
  const hasPublicDns = servers.some(
    (s) => s && !s.startsWith('127.') && !s.startsWith('0.') && s !== 'localhost' && !s.includes('local')
  );
  if (!hasPublicDns && servers.length) {
    dns.setServers(FALLBACK_DNS_SERVERS);
  }
}
