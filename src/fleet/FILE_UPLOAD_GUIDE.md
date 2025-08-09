# File Upload Guide for Fleet Management

This guide explains how to use the file upload functionality for driver documents in the fleet management system.

## File Upload Endpoint

### **Endpoint:**

```
POST /fleet/drivers/with-files
```

### **Content-Type:**

```
multipart/form-data
```

## Supported File Types

The system accepts the following file types for driver documents:

- **Images**: JPG, JPEG, PNG, GIF
- **Documents**: PDF, DOC, DOCX
- **Maximum file size**: 10MB per file

## File Fields

| Field Name           | Description          | Required | Max Files |
| -------------------- | -------------------- | -------- | --------- |
| `idPhoto`            | National ID photo    | ❌       | 1         |
| `driverLicensePhoto` | Driver license photo | ❌       | 1         |
| `psvLicenseDoc`      | PSV license document | ❌       | 1         |
| `passportPhoto`      | Passport photo       | ❌       | 1         |

## Sample Request

### **Using cURL:**

```bash
curl -X POST http://localhost:3000/fleet/drivers/with-files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "email=john.doe@fleetcompany.com" \
  -F "phoneNumber=254712345678" \
  -F "nationalId=12345678" \
  -F "gender=male" \
  -F "licenseNumber=DL123456789" \
  -F "licenseExpiry=2025-12-31" \
  -F "dateOfBirth=1985-06-15" \
  -F "address=123 Main Street, Nairobi" \
  -F "emergencyContact=Jane Doe" \
  -F "emergencyPhone=254798765432" \
  -F "isActive=true" \
  -F "notes=Experienced driver" \
  -F "idPhoto=@/path/to/id_photo.jpg" \
  -F "driverLicensePhoto=@/path/to/license.jpg" \
  -F "psvLicenseDoc=@/path/to/psv_license.pdf" \
  -F "passportPhoto=@/path/to/passport.jpg"
```

### **Using JavaScript/Fetch:**

```javascript
const formData = new FormData();

// Add text fields
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('email', 'john.doe@fleetcompany.com');
formData.append('phoneNumber', '254712345678');
formData.append('nationalId', '12345678');
formData.append('gender', 'male');
formData.append('licenseNumber', 'DL123456789');
formData.append('licenseExpiry', '2025-12-31');
formData.append('dateOfBirth', '1985-06-15');
formData.append('address', '123 Main Street, Nairobi');
formData.append('emergencyContact', 'Jane Doe');
formData.append('emergencyPhone', '254798765432');
formData.append('isActive', 'true');
formData.append('notes', 'Experienced driver');

// Add files
formData.append('idPhoto', fileInput.files[0]);
formData.append('driverLicensePhoto', licenseFile.files[0]);
formData.append('psvLicenseDoc', psvFile.files[0]);
formData.append('passportPhoto', passportFile.files[0]);

fetch('http://localhost:3000/fleet/drivers/with-files', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_JWT_TOKEN',
  },
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### **Using Postman:**

1. Set method to `POST`
2. Set URL to `http://localhost:3000/fleet/drivers/with-files`
3. Add Authorization header: `Bearer YOUR_JWT_TOKEN`
4. In Body tab, select `form-data`
5. Add all text fields as key-value pairs
6. Add file fields by selecting "File" type for the value

## File Storage Structure

Files are stored in the following directory structure:

```
uploads/
├── drivers/
│   ├── id_photos/
│   │   └── 1703123456789_abc123.jpg
│   ├── licenses/
│   │   └── 1703123456789_def456.jpg
│   ├── psv/
│   │   └── 1703123456789_ghi789.pdf
│   └── passports/
│       └── 1703123456789_jkl012.jpg
```

## File Access

Uploaded files can be accessed via HTTP URLs:

```
http://localhost:3000/uploads/drivers/id_photos/1703123456789_abc123.jpg
http://localhost:3000/uploads/drivers/licenses/1703123456789_def456.jpg
http://localhost:3000/uploads/drivers/psv/1703123456789_ghi789.pdf
http://localhost:3000/uploads/drivers/passports/1703123456789_jkl012.jpg
```

## Response Format

### **Success Response:**

```json
{
  "response": {
    "code": 201,
    "message": "Driver created successfully with files."
  },
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@fleetcompany.com",
    "phoneNumber": "254712345678",
    "nationalId": "12345678",
    "gender": "male",
    "licenseNumber": "DL123456789",
    "licenseExpiry": "2025-12-31T00:00:00.000Z",
    "idPhoto": "/uploads/drivers/id_photos/1703123456789_abc123.jpg",
    "driverLicensePhoto": "/uploads/drivers/licenses/1703123456789_def456.jpg",
    "psvLicenseDoc": "/uploads/drivers/psv/1703123456789_ghi789.pdf",
    "passportPhoto": "/uploads/drivers/passports/1703123456789_jkl012.jpg",
    "isActive": true,
    "createdAt": "2024-07-20T14:30:00.000Z",
    "lastUpdatedAt": "2024-07-20T14:30:00.000Z"
  }
}
```

### **Error Response:**

```json
{
  "response": {
    "code": 400,
    "message": "Validation failed"
  },
  "data": {
    "errors": ["firstName should not be empty", "email must be an email"]
  }
}
```

## Error Handling

The system handles various error scenarios:

1. **File too large**: Returns 400 error with file size limit message
2. **Invalid file type**: Returns 400 error with supported file types
3. **Database errors**: Returns appropriate database error messages
4. **File upload failures**: Automatically cleans up uploaded files and returns error

## Security Considerations

- Files are stored outside the web root for security
- File names are randomized to prevent path traversal attacks
- File types are validated on both client and server
- File size limits are enforced
- Access to files is controlled through the application

## Notes

- All file fields are optional
- Files are automatically organized by type in separate folders
- File paths are stored in the database for easy retrieval
- The system automatically creates necessary directories
- Files are served statically for optimal performance
