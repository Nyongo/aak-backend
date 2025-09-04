# Digital Ocean PostgreSQL Access Setup

## 1. Configure UFW Firewall (if using Ubuntu/Debian)

```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp

# Check firewall status
sudo ufw status
```

## 2. Alternative: Configure iptables directly

```bash
# Allow PostgreSQL connections
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Save iptables rules (Ubuntu/Debian)
sudo iptables-save > /etc/iptables/rules.v4
```

## 3. Digital Ocean Cloud Firewall (Recommended)

1. Go to your Digital Ocean dashboard
2. Navigate to "Networking" → "Firewalls"
3. Create a new firewall or edit existing one
4. Add inbound rule:
   - Type: Custom
   - Protocol: TCP
   - Port Range: 5432
   - Sources: Your IP address (for security)

## 4. Restart Docker Services

After making configuration changes:

```bash
# Stop existing containers
docker-compose down

# Start with new configuration
docker-compose up -d

# Check if PostgreSQL is running and accessible
docker-compose logs postgres
```

## 5. Test Connection

From your local machine, test the connection:

```bash
# Test if port is accessible
telnet YOUR_DROPLET_IP 5432

# Or use psql if you have it installed
psql -h YOUR_DROPLET_IP -p 5432 -U postgres -d nest
```

## Security Notes

- Consider using a VPN or restricting access to your specific IP address
- For production, enable SSL and use stronger authentication
- Regularly update your database credentials
- Monitor connection logs for suspicious activity
