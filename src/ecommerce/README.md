# E-Commerce Module

The E-Commerce module provides functionality for managing products, categories, suppliers, and related e-commerce operations.

## Features

### Product Categories

Full CRUD operations for product categories with the following features:

- **Create** categories with name, status, description, and image
- **Read** all categories or fetch by ID
- **Update** existing categories
- **Delete** categories with automatic image cleanup

#### Category Fields

- `name` (required): Unique category name
- `status` (required): Either "Active" or "Inactive"
- `description` (optional): Short description of the category
- `imageUrl` (optional): URL/path to category image

### Suppliers

Full CRUD operations for suppliers with the following features:

- **Create** suppliers with company details, contact info, and logo
- **Read** all suppliers or fetch by ID
- **Update** existing suppliers
- **Delete** suppliers with automatic logo cleanup

#### Supplier Fields

- `company` (required): Unique legal or trading name
- `contactPerson` (required): Contact person's name
- `email` (required): Unique email address
- `phone` (optional): Phone number
- `logoUrl` (optional): URL/path to company logo
- `categoryId` (optional): Reference to product category
- `notes` (optional): Additional notes (MOQ, certifications, etc.)
- `status` (optional): Status, defaults to "Active"

### Products

Full CRUD operations for products with the following features:

- **Create** products with name, supplier, category, price, and stock
- **Read** all products or fetch by ID
- **Update** existing products
- **Delete** products with automatic image cleanup

#### Product Fields

- `name` (required): Product name
- `supplierId` (optional): Reference to supplier
- `categoryId` (optional): Reference to product category
- `price` (optional): Product price in KSh
- `stock` (optional): Stock quantity, defaults to 0
- `imageUrl` (optional): URL/path to product image
- `description` (optional): Product description
- `status` (optional): Status, defaults to "Active"

#### File Upload Support

- Accepts PNG, JPG, JPEG, and SVG images
- Maximum file size: 2MB
- Category images stored in `uploads/ecommerce/categories/`
- Supplier logos stored in `uploads/ecommerce/suppliers/`
- Product images stored in `uploads/ecommerce/products/`
- Automatic file cleanup on deletion

## API Endpoints

### Base Path: `/ecommerce/categories`

All endpoints require JWT authentication and permissions (currently commented out for testing).

### POST `/ecommerce/categories`

Create a new product category.

**Request:**

- `multipart/form-data` body with:
  - `name` (required): Category name
  - `status` (required): "Active" or "Inactive"
  - `description` (optional): Category description
  - `categoryImage` (optional): Image file

**Response:**

```json
{
  "response": {
    "code": 201,
    "message": "Product category created successfully."
  },
  "data": {
    "id": 1,
    "name": "Snacks",
    "status": "Active",
    "description": "Delicious snacks category",
    "imageUrl": "/uploads/ecommerce/categories/category_snacks_1234567890.png",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### GET `/ecommerce/categories`

Fetch all product categories.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product categories fetched successfully."
  },
  "data": [
    {
      "id": 1,
      "name": "Snacks",
      "status": "Active",
      "description": "Delicious snacks category",
      "imageUrl": "/uploads/ecommerce/categories/category_snacks_1234567890.png",
      "createdAt": "2025-11-03T14:00:00.000Z",
      "updatedAt": "2025-11-03T14:00:00.000Z"
    }
  ]
}
```

### GET `/ecommerce/categories/:id`

Fetch a single category by ID.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product category retrieved successfully."
  },
  "data": {
    "id": 1,
    "name": "Snacks",
    "status": "Active",
    "description": "Delicious snacks category",
    "imageUrl": "/uploads/ecommerce/categories/category_snacks_1234567890.png",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### PUT `/ecommerce/categories/:id`

Update an existing category.

**Request:**

- `multipart/form-data` body with:
  - `name` (optional): Category name
  - `status` (optional): "Active" or "Inactive"
  - `description` (optional): Category description
  - `categoryImage` (optional): New image file

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product category updated successfully."
  },
  "data": {
    "id": 1,
    "name": "Updated Snacks",
    "status": "Active",
    "description": "Updated description",
    "imageUrl": "/uploads/ecommerce/categories/category_updated_snacks_1234567890.png",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:30:00.000Z"
  }
}
```

### DELETE `/ecommerce/categories/:id`

Delete a category and its associated image.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product category deleted successfully."
  },
  "data": null
}
```

### Base Path: `/ecommerce/suppliers`

All endpoints require JWT authentication and permissions (currently commented out for testing).

### POST `/ecommerce/suppliers`

Create a new supplier.

**Request:**

- `multipart/form-data` body with:
  - `company` (required): Company name
  - `contactPerson` (required): Contact person name
  - `email` (required): Email address
  - `phone` (optional): Phone number
  - `categoryId` (optional): Product category ID
  - `notes` (optional): Notes
  - `status` (optional): Status, defaults to "Active"
  - `companyLogo` (optional): Logo file

**Response:**

```json
{
  "response": {
    "code": 201,
    "message": "Supplier created successfully."
  },
  "data": {
    "id": 1,
    "company": "Tropical Delights Ltd.",
    "contactPerson": "Jane Doe",
    "email": "jane@tropical.co",
    "phone": "+254 7XX XXX XXX",
    "logoUrl": "/uploads/ecommerce/suppliers/supplier_tropical_delights_ltd_1234567890.png",
    "categoryId": 1,
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "notes": "Certified supplier",
    "status": "Active",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### GET `/ecommerce/suppliers`

Fetch all suppliers.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Suppliers fetched successfully."
  },
  "data": [
    {
      "id": 1,
      "company": "Tropical Delights Ltd.",
      "contactPerson": "Jane Doe",
      "email": "jane@tropical.co",
      "phone": "+254 7XX XXX XXX",
      "logoUrl": "/uploads/ecommerce/suppliers/supplier_tropical_delights_ltd_1234567890.png",
      "categoryId": 1,
      "category": {
        "id": 1,
        "name": "Snacks",
        "status": "Active"
      },
      "notes": "Certified supplier",
      "status": "Active",
      "createdAt": "2025-11-03T14:00:00.000Z",
      "updatedAt": "2025-11-03T14:00:00.000Z"
    }
  ]
}
```

### GET `/ecommerce/suppliers/:id`

Fetch a single supplier by ID.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Supplier retrieved successfully."
  },
  "data": {
    "id": 1,
    "company": "Tropical Delights Ltd.",
    "contactPerson": "Jane Doe",
    "email": "jane@tropical.co",
    "phone": "+254 7XX XXX XXX",
    "logoUrl": "/uploads/ecommerce/suppliers/supplier_tropical_delights_ltd_1234567890.png",
    "categoryId": 1,
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "notes": "Certified supplier",
    "status": "Active",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### PUT `/ecommerce/suppliers/:id`

Update an existing supplier.

**Request:**

- `multipart/form-data` body with:
  - `company` (optional): Company name
  - `contactPerson` (optional): Contact person name
  - `email` (optional): Email address
  - `phone` (optional): Phone number
  - `categoryId` (optional): Product category ID
  - `notes` (optional): Notes
  - `status` (optional): Status
  - `companyLogo` (optional): New logo file

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Supplier updated successfully."
  },
  "data": {
    "id": 1,
    "company": "Updated Tropical Delights Ltd.",
    "contactPerson": "Jane Doe",
    "email": "jane@tropical.co",
    "phone": "+254 7XX XXX XXX",
    "logoUrl": "/uploads/ecommerce/suppliers/supplier_updated_tropical_delights_ltd_1234567890.png",
    "categoryId": 1,
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "notes": "Updated notes",
    "status": "Active",
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:30:00.000Z"
  }
}
```

### DELETE `/ecommerce/suppliers/:id`

Delete a supplier and its associated logo.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Supplier deleted successfully."
  },
  "data": null
}
```

### Base Path: `/ecommerce/products`

All endpoints require JWT authentication and permissions (currently commented out for testing).

### POST `/ecommerce/products`

Create a new product.

**Request:**

- `multipart/form-data` body with:
  - `name` (required): Product name
  - `supplierId` (optional): Supplier ID
  - `categoryId` (optional): Category ID
  - `price` (optional): Price in KSh
  - `stock` (optional): Stock quantity
  - `description` (optional): Description
  - `status` (optional): Status, defaults to "Active"
  - `productImage` (optional): Product image file

**Response:**

```json
{
  "response": {
    "code": 201,
    "message": "Product created successfully."
  },
  "data": {
    "id": 1,
    "name": "Jackfruit Chips",
    "supplierId": 1,
    "categoryId": 1,
    "price": 150.0,
    "stock": 150,
    "imageUrl": "/uploads/ecommerce/products/product_jackfruit_chips_1234567890.png",
    "description": "Delicious dried jackfruit chips",
    "status": "Active",
    "supplier": {
      "id": 1,
      "company": "Tropical Delights Ltd.",
      "contactPerson": "Jane Doe"
    },
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### GET `/ecommerce/products`

Fetch all products.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Products fetched successfully."
  },
  "data": [
    {
      "id": 1,
      "name": "Jackfruit Chips",
      "supplierId": 1,
      "categoryId": 1,
      "price": 150.0,
      "stock": 150,
      "imageUrl": "/uploads/ecommerce/products/product_jackfruit_chips_1234567890.png",
      "description": "Delicious dried jackfruit chips",
      "status": "Active",
      "supplier": {
        "id": 1,
        "company": "Tropical Delights Ltd.",
        "contactPerson": "Jane Doe"
      },
      "category": {
        "id": 1,
        "name": "Snacks",
        "status": "Active"
      },
      "createdAt": "2025-11-03T14:00:00.000Z",
      "updatedAt": "2025-11-03T14:00:00.000Z"
    }
  ]
}
```

### GET `/ecommerce/products/:id`

Fetch a single product by ID.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product retrieved successfully."
  },
  "data": {
    "id": 1,
    "name": "Jackfruit Chips",
    "supplierId": 1,
    "categoryId": 1,
    "price": 150.0,
    "stock": 150,
    "imageUrl": "/uploads/ecommerce/products/product_jackfruit_chips_1234567890.png",
    "description": "Delicious dried jackfruit chips",
    "status": "Active",
    "supplier": {
      "id": 1,
      "company": "Tropical Delights Ltd.",
      "contactPerson": "Jane Doe"
    },
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:00:00.000Z"
  }
}
```

### PUT `/ecommerce/products/:id`

Update an existing product.

**Request:**

- `multipart/form-data` body with:
  - `name` (optional): Product name
  - `supplierId` (optional): Supplier ID
  - `categoryId` (optional): Category ID
  - `price` (optional): Price in KSh
  - `stock` (optional): Stock quantity
  - `description` (optional): Description
  - `status` (optional): Status
  - `productImage` (optional): New product image file

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product updated successfully."
  },
  "data": {
    "id": 1,
    "name": "Updated Jackfruit Chips",
    "supplierId": 1,
    "categoryId": 1,
    "price": 175.0,
    "stock": 200,
    "imageUrl": "/uploads/ecommerce/products/product_updated_jackfruit_chips_1234567890.png",
    "description": "Updated description",
    "status": "Active",
    "supplier": {
      "id": 1,
      "company": "Tropical Delights Ltd.",
      "contactPerson": "Jane Doe"
    },
    "category": {
      "id": 1,
      "name": "Snacks",
      "status": "Active"
    },
    "createdAt": "2025-11-03T14:00:00.000Z",
    "updatedAt": "2025-11-03T14:30:00.000Z"
  }
}
```

### DELETE `/ecommerce/products/:id`

Delete a product and its associated image.

**Response:**

```json
{
  "response": {
    "code": 200,
    "message": "Product deleted successfully."
  },
  "data": null
}
```

## File Upload Validation

- **Allowed types**: PNG, JPG, JPEG, SVG
- **Maximum size**: 2MB
- **Category images**: `uploads/ecommerce/categories/`
- **Supplier logos**: `uploads/ecommerce/suppliers/`
- **Product images**: `uploads/ecommerce/products/`
- **Category naming**: `category_{sanitized_name}_{timestamp}.{extension}`
- **Supplier naming**: `supplier_{sanitized_company}_{timestamp}.{extension}`
- **Product naming**: `product_{sanitized_name}_{timestamp}.{extension}`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "response": {
    "code": 400,
    "message": "Error description"
  },
  "data": null
}
```

Common error codes:

- `400`: Bad request (validation errors, invalid file types, etc.)
- `401`: Unauthorized (missing or invalid JWT)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found (product, category, or supplier doesn't exist)
- `500`: Internal server error

## Database

The E-Commerce models are mapped to the following tables in PostgreSQL.

**Schemas:**

```prisma
model ProductCategory {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  status      String    @default("Active")
  description String?
  imageUrl    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  suppliers   Supplier[]
  products    Product[]

  @@map("product_categories")
}

model Supplier {
  id           Int       @id @default(autoincrement())
  company      String    @unique
  contactPerson String
  email        String    @unique
  phone        String?
  logoUrl      String?
  categoryId   Int?
  category     ProductCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  notes        String?
  status       String    @default("Active")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  products     Product[]

  @@map("suppliers")
}

model Product {
  id            Int       @id @default(autoincrement())
  name          String
  supplierId    Int?
  categoryId    Int?
  price         Float?
  stock         Int       @default(0)
  imageUrl      String?
  description   String?
  status        String    @default("Active")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  supplier      Supplier? @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  category      ProductCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@map("products")
}
```

## Future Enhancements

Potential features to add:

- Advanced inventory tracking and low stock alerts
- Order management
- Cart functionality
- Payment integration
- Product reviews and ratings
- Category hierarchy (parent/child categories)
- Bulk operations for categories and suppliers
- Supplier performance tracking
- Purchase orders
- Supplier contracts and agreements
