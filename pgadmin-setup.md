# pgAdmin Connection Setup

## Connection Details

Use these settings in pgAdmin to connect to your Digital Ocean PostgreSQL database:

### General Tab

- **Name**: Digital Ocean Nest DB (or any name you prefer)
- **Host name/address**: `YOUR_DROPLET_IP_ADDRESS`
- **Port**: `5432`
- **Maintenance database**: `nest`
- **Username**: `postgres`
- **Password**: `NyNj92`

### Advanced Tab

- **DB restriction**: `nest` (optional, limits to specific database)

## Step-by-Step Instructions

1. **Open pgAdmin** on your local machine

2. **Create New Server**:

   - Right-click on "Servers" in the left panel
   - Select "Create" → "Server..."

3. **General Tab**:

   - Enter a name for your connection (e.g., "Digital Ocean Nest DB")

4. **Connection Tab**:

   - **Host name/address**: Enter your Digital Ocean droplet's public IP address
   - **Port**: `5432`
   - **Maintenance database**: `nest`
   - **Username**: `postgres`
   - **Password**: `NyNj92`
   - Check "Save password?" if you want pgAdmin to remember it

5. **Advanced Tab** (Optional):

   - **DB restriction**: Enter `nest` to limit access to only this database

6. **Click "Save"**

## Troubleshooting

### Connection Refused

- Verify your Digital Ocean droplet's IP address
- Check if port 5432 is open in the firewall
- Ensure Docker containers are running: `docker-compose ps`

### Authentication Failed

- Double-check username and password
- Verify the database name is correct (`nest`)

### Timeout Issues

- Check your internet connection
- Verify the droplet is running and accessible
- Try connecting from the droplet itself: `docker exec -it postgres_container psql -U postgres -d nest`

## Security Recommendations

1. **Change Default Password**: Consider changing the default password for better security
2. **IP Restriction**: Limit firewall access to your specific IP address
3. **VPN**: Use a VPN connection for additional security
4. **SSL**: Enable SSL in production environments

## Testing the Connection

Once connected, you should see:

- The `nest` database in the server tree
- All your tables (User, Role, Permission, etc.)
- Ability to run queries and browse data
