import { Inject, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppSheetService {
  // Initialize the logger
  private readonly logger = new Logger(AppSheetService.name);

  // Inject CacheManager
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private readonly baseUrl = 'https://api.appsheet.com/api/v2';
  //   private readonly appId = '7415cc60-0074-43c1-9327-f0d72e487674';
  //   private readonly apiKey =
  //     'V2-9vsZG-7yjUk-ayy3f-CRDVV-dzYsf-TqJSu-9U6pZ-vTTym';

  private readonly appId = '5544e87b-1f5b-42dd-a2ad-77638084d3de';
  private readonly apiKey =
    'V2-nRQGq-M7sEI-9RXHi-uvp1B-TouUe-16iIS-bJKe9-N4gB1';

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ApplicationAccessKey: this.apiKey,
      'X-AppSheet-API-Version': '2.0',
    };
  }

  // Private helper to handle common API call logic
  private async _callAppSheetApi<T = any>(
    tableName: string,
    requestBody: any,
    actionDesc: string, // e.g., "Find", "Add"
  ): Promise<T> {
    const url = `${this.baseUrl}/apps/${this.appId}/tables/${tableName}/Action`;
    this.logger.log(
      `=== Calling AppSheet API (${actionDesc} ${tableName}) ===`,
    );
    this.logger.log(`URL: ${url}`);
    this.logger.log(`Request Body: ${JSON.stringify(requestBody, null, 2)}`);

    try {
      const response = await axios.post<T | string>(url, requestBody, {
        headers: this.getHeaders(),
        validateStatus: (status) => status < 500,
      });

      this.logger.log(
        `=== AppSheet API Response (${actionDesc} ${tableName}) ===`,
      );
      this.logger.log(`Status: ${response.status}`);
      this.logger.log(
        `Raw Response: ${JSON.stringify(response.data, null, 2)}`,
      );

      if (response.status !== 200) {
        const errorMsg = `AppSheet API Error (${actionDesc} ${tableName}): Status ${response.status}`;
        this.logger.error(errorMsg);
        this.logger.error(`Response Data: ${JSON.stringify(response.data)}`);
        throw new Error(errorMsg);
      }

      let data = response.data;

      // Handle potential string response
      if (typeof data === 'string') {
        if (data.trim() === '' || data.trim().toLowerCase() === 'null') {
          this.logger.warn(
            `Received empty string response for ${actionDesc} ${tableName}. Handling appropriately.`,
          );
          // For Find, return empty array. For Add/Update, this might be okay or might need specific handling.
          return (requestBody.Action === 'Find' ? [] : null) as T;
        }
        try {
          data = JSON.parse(data);
        } catch (e) {
          this.logger.error(
            `Failed to parse string response for ${actionDesc} ${tableName} as JSON: ${data}`,
            e instanceof Error ? e.stack : e,
          );
          throw new Error(
            `Invalid JSON response from AppSheet API for ${actionDesc} ${tableName}`,
          );
        }
      }

      return data as T;
    } catch (error) {
      this.logger.error(
        `Error during AppSheet API call (${actionDesc} ${tableName}):`,
        error instanceof Error ? error.stack : error,
      );
      if (axios.isAxiosError(error)) {
        this.logger.error('Axios Error Details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
        });
        throw new Error(
          `AppSheet API request failed (${actionDesc} ${tableName}): ${error.message}`,
        );
      } else {
        throw error;
      }
    }
  }

  // Generic method to fetch data using Selector property.
  async getTableData<T>(
    tableName: string,
    selector?: string, // AppSheet expression, e.g., "Filter(TableName, [Condition])"
  ): Promise<T[]> {
    const properties: Record<string, any> = {};
    if (selector) {
      properties.Selector = selector;
    }

    // If selector is null/undefined, properties remains {} which fetches all.
    const requestBody = {
      Action: 'Find',
      Properties: properties,
    };

    const data = await this._callAppSheetApi<T[] | object>(
      tableName,
      requestBody,
      'Find',
    );

    // Ensure the final result is an array
    if (Array.isArray(data)) {
      this.logger.log(
        `getTableData found ${data.length} records for ${tableName}`,
      );
      return data as T[];
    }

    // Handle cases where API might wrap array in { Rows: [...] } etc.
    if (typeof data === 'object' && data !== null) {
      const possibleDataKeys = ['Rows', 'records', 'items', 'data'];
      for (const key of possibleDataKeys) {
        if (Array.isArray((data as any)[key])) {
          this.logger.log(`Found data array in response property: ${key}`);
          return (data as any)[key] as T[];
        }
      }
    }

    // If we reach here, the response wasn't an array or known wrapper
    this.logger.warn(
      `Received non-array response for ${tableName} Find: ${JSON.stringify(data)}. Returning empty array.`,
    );
    return [];
  }

  // Specific getters remain simple wrappers
  async getBorrowers(): Promise<any[]> {
    const cacheKey = 'all_borrowers';
    this.logger.log(`[CACHE] Checking cache for key: ${cacheKey}`);

    try {
      const cachedBorrowers = await this.cacheManager.get<any[]>(cacheKey);
      // More explicit check: Must be an array with items to be a valid hit
      if (
        cachedBorrowers &&
        Array.isArray(cachedBorrowers) &&
        cachedBorrowers.length > 0
      ) {
        this.logger.log(
          `[CACHE] HIT for key: ${cacheKey}. Found ${cachedBorrowers.length} records.`,
        );
        return cachedBorrowers; // Return immediately on valid cache hit
      } else if (cachedBorrowers) {
        // Log if we got something but it wasn't a valid array (e.g., empty array, null)
        this.logger.warn(
          `[CACHE] Invalid data found in cache for ${cacheKey}. Type: ${typeof cachedBorrowers}, Length: ${Array.isArray(cachedBorrowers) ? cachedBorrowers.length : 'N/A'}. Proceeding to fetch.`,
        );
      } else {
        // Log explicit miss (get returned null or undefined)
        this.logger.log(`[CACHE] MISS for key: ${cacheKey}.`);
      }
      if (cachedBorrowers) {
        this.logger.log(`Cache hit for ${cacheKey}.`);
        return cachedBorrowers;
      }
    } catch (cacheError) {
      this.logger.error(`Error reading from cache ${cacheKey}:`, cacheError);
    }

    this.logger.log(`Cache miss for ${cacheKey}. Fetching from AppSheet...`);
    // Fetch all using getTableData workaround
    const allBorrowers = await this.getTableData<any>('Borrowers');

    try {
      // Store in cache with default TTL
      await this.cacheManager.set(cacheKey, allBorrowers);
      this.logger.log(
        `Stored ${allBorrowers.length} borrowers in cache (${cacheKey}).`,
      );
    } catch (cacheError) {
      this.logger.error(`Error writing to cache ${cacheKey}:`, cacheError);
    }

    return allBorrowers;
  }

  async getSchools(): Promise<any[]> {
    this.logger.log('Fetching ALL Schools data (Workaround)...');
    const allSchools = await this.getTableData<any>('Schools');
    return allSchools; // Return all data for now
  }

  async getTeachers(): Promise<any[]> {
    this.logger.log(
      'Fetching ALL Teachers data (Workaround: Filtering client-side)...',
    );
    const properties: Record<string, any> = {}; // Intentionally empty

    try {
      const teachers = await this.getTableData<any>('Teachers');
      this.logger.log(
        `Teachers fetch completed (fetched ${teachers.length} total).`,
      );
      // Optional: Log details about fetched data - COMMENTED OUT FOR DEBUGGING
      // this.logger.log(`Data type: ${typeof teachers}`);
      // this.logger.log(`Is array: ${Array.isArray(teachers)}`);
      // this.logger.log(`Data length: ${teachers.length}`);
      // this.logger.log(
      //  `First record: ${teachers.length > 0 ? JSON.stringify(teachers[0], null, 2) : 'No records'}`,
      // );
      return teachers;
    } catch (error) {
      this.logger.error(
        `Error fetching Teachers: ${error instanceof Error ? error.message : error}`,
      );
      throw error; // Re-throw the error to be handled by the controller
    }
  }

  async listTables() {
    try {
      const url = `${this.baseUrl}/apps/${this.appId}/tables`;
      console.log('Fetching table list from:', url);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      console.log('Table list response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error listing tables:', error);
      throw error;
    }
  }

  async getTableSchema(tableName: string) {
    try {
      const url = `${this.baseUrl}/apps/${this.appId}/tables/${tableName}/Action`;
      const requestBody = {
        Action: 'GetSchema',
      };

      console.log('Fetching table schema from:', url);
      console.log('Request body:', requestBody);

      const response = await axios.post(url, requestBody, {
        headers: this.getHeaders(),
      });

      console.log('Table schema response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching table schema:', error);
      throw error;
    }
  }

  async getTableSample(tableName: string) {
    try {
      const url = `${this.baseUrl}/apps/${this.appId}/tables/${tableName}/Action`;
      const requestBody = {
        Action: 'Find',
        Properties: {
          Select: ['*'],
          Take: 1, // Only fetch one record
        },
      };

      console.log('Fetching table sample from:', url);
      console.log('Request body:', requestBody);

      const response = await axios.post(url, requestBody, {
        headers: this.getHeaders(),
      });

      console.log('Table sample response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching table sample:', error);
      throw error;
    }
  }

  async testTableAccess(tableName: string) {
    try {
      const url = `${this.baseUrl}/apps/${this.appId}/tables/${tableName}/Action`;

      // First try to get schema
      const schemaRequest = {
        Action: 'GetSchema',
      };

      console.log('=== Testing Table Access ===');
      console.log('Table:', tableName);
      console.log('URL:', url);
      console.log('Trying to get schema...');

      const schemaResponse = await axios.post(url, schemaRequest, {
        headers: this.getHeaders(),
      });

      console.log('Schema Response:', schemaResponse.data);

      // Then try to get a single record
      const findRequest = {
        Action: 'Find',
        Properties: {
          Select: ['*'],
          Take: 1,
        },
      };

      console.log('Trying to get a record...');
      const findResponse = await axios.post(url, findRequest, {
        headers: this.getHeaders(),
      });

      console.log('Find Response:', findResponse.data);

      return {
        schema: schemaResponse.data,
        data: findResponse.data,
        status: {
          schema: schemaResponse.status,
          find: findResponse.status,
        },
      };
    } catch (error) {
      console.error('Error testing table access:', error);
      throw error;
    }
  }

  async testApiConnection() {
    try {
      // First verify the API key format
      console.log('=== Verifying API Key ===');
      console.log(
        'API Key Format:',
        this.apiKey.startsWith('V2-') ? 'Valid' : 'Invalid',
      );
      console.log('API Key Length:', this.apiKey.length);

      // Try a simple GET request to verify API key and list tables
      const verifyUrl = `${this.baseUrl}/apps/${this.appId}/tables`;
      console.log('=== Testing API Key & Tables Access ===');
      console.log('URL:', verifyUrl);
      console.log('Headers:', JSON.stringify(this.getHeaders(), null, 2));

      const verifyResponse = await axios.get(verifyUrl, {
        headers: this.getHeaders(),
      });

      console.log('=== API Key/Tables Verification Response ===');
      console.log('Status:', verifyResponse.status);
      console.log('Data:', verifyResponse.data);

      // Try to get schema for Users table (simplest format)
      const schemaUrl = `${this.baseUrl}/apps/${this.appId}/tables/Users/Action`;
      const schemaRequestBody = {
        Action: 'GetSchema', // Removed Properties object
      };

      console.log('=== Getting Table Schema (Users) ===');
      console.log('URL:', schemaUrl);
      console.log('Request Body:', JSON.stringify(schemaRequestBody, null, 2));

      const schemaResponse = await axios.post(schemaUrl, schemaRequestBody, {
        headers: this.getHeaders(),
      });

      console.log('=== Schema Response (Users) ===');
      console.log('Status:', schemaResponse.status);
      console.log('Data:', schemaResponse.data);

      // Now try to get data from Users table (simplest Find)
      const dataUrl = `${this.baseUrl}/apps/${this.appId}/tables/Users/Action`;
      const requestBody = {
        Action: 'Find',
        Properties: {
          // Removed TableName, Select, Where, Sort - minimal request
          Take: 1,
        },
      };

      console.log('=== Testing Data Access (Users - Minimal Find) ===');
      console.log('URL:', dataUrl);
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      const dataResponse = await axios.post(dataUrl, requestBody, {
        headers: this.getHeaders(),
        validateStatus: (status) => status < 500,
      });

      console.log('=== Data Response (Users - Minimal Find) ===');
      console.log('Status:', dataResponse.status);
      console.log('Data:', dataResponse.data);

      return {
        success: true,
        apiKeyFormat: this.apiKey.startsWith('V2-') ? 'Valid' : 'Invalid',
        verifyStatus: verifyResponse.status,
        verifyData: verifyResponse.data,
        schemaStatus: schemaResponse.status,
        schemaData: schemaResponse.data,
        dataStatus: dataResponse.status,
        data: dataResponse.data || [],
        rawResponse: dataResponse.data, // Keep raw response from last data attempt
      };
    } catch (error) {
      console.error('=== API Connection Test Failed ===');
      if (axios.isAxiosError(error)) {
        console.error('Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        });
        return {
          success: false,
          status: error.response?.status,
          error: error.message,
          details: error.response?.data,
          url: error.config?.url,
        };
      }
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  /* // Method removed - Replaced by client-side filtering on cached data
  // Generic method to find a record by a specific field value (using Selector)
  async findRecordByField(
    tableName: string,
    fieldName: string, // Exact column name in AppSheet
    value: string | number | boolean, // Value to search for
  ): Promise<any | null> {
    this.logger.log(
      `Finding record in ${tableName} where ${fieldName} = ${value} using Selector`,
    );

    // Construct the AppSheet FILTER expression
    // Ensure value is properly quoted if it's a string
    const filterValue =
      typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    // IMPORTANT: Ensure fieldName matches the EXACT column name in AppSheet
    const selector = `Filter(${tableName}, [${fieldName}]=${filterValue})`;

    try {
      // Use getTableData with the selector
      const foundRecords = await this.getTableData<any>(tableName, selector);

      if (foundRecords.length > 0) {
        if (foundRecords.length > 1) {
          this.logger.warn(
            `Selector found multiple records in ${tableName} where ${fieldName} = ${value}. Returning first.`,
          );
        }
        this.logger.log(
          `Selector found record in ${tableName} where ${fieldName} = ${value}`,
        );
        return foundRecords[0];
      }
      this.logger.log(
        `Selector found no record in ${tableName} where ${fieldName} = ${value}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding record using Selector (${tableName}, ${fieldName}=${value}): ${error instanceof Error ? error.message : error}`,
      );
      // Re-throw or handle as appropriate for your application
      throw error;
    }
  }
  */

  // Method restored - Uses Selector to find by  ID
  // Generic method to find a record by its AppSheet  ID (using Selector)
  async findRecordById(tableName: string, rowId: string): Promise<any | null> {
    this.logger.log(`Finding record in ${tableName} with  ID: ${rowId}`);

    // Construct the AppSheet FILTER expression using the Row ID
    // AppSheet Row IDs are typically strings and safe for direct use in expression
    // IMPORTANT: Ensure the column name [Row ID] is correct for your table!
    const selector = `Filter(${tableName}, [ID]="${rowId}")`;

    try {
      // Use getTableData which now accepts selector
      const foundRecords = await this.getTableData<any>(tableName, selector);

      if (foundRecords.length > 0) {
        if (foundRecords.length > 1) {
          // This should ideally not happen if Row ID is truly unique
          this.logger.warn(
            `Selector found multiple records in ${tableName} with Row ID ${rowId}. Returning first.`,
          );
        }
        this.logger.log(`Found record in ${tableName} with Row ID ${rowId}`);
        return foundRecords[0];
      }
      this.logger.log(`No record found in ${tableName} with Row ID ${rowId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding record by Row ID using Selector (${tableName}, ${rowId}): ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  // --- Specific find methods now filter cached data ---
  async findTeacherByName(name: string): Promise<any | null> {
    this.logger.log(`Finding teacher by name (using cache): ${name}`);
    // Get potentially cached list of all teachers
    const allTeachers = await this.getTeachers();
    // Filter client-side
    const foundTeacher = allTeachers.find((teacher) => teacher.Name === name);
    if (foundTeacher) {
      this.logger.log(`Found teacher in cache/fetch: ${name}`);
      return foundTeacher;
    }
    this.logger.log(`No teacher found in cache/fetch with name: ${name}`);
    return null;
  }

  async findBorrowerByName(name: string): Promise<any | null> {
    // const startTime = Date.now(); // Start timer
    this.logger.log(
      `Finding borrower by name (using cache): ${name}`,
      // `[Timer Debug] Service findBorrowerByName START - Name: ${name}`,
    );
    // Get potentially cached list of all borrowers
    const allBorrowers = await this.getBorrowers();
    // const getBorrowersDuration = Date.now() - startTime;
    // this.logger.log(
    //   `[Timer Debug] Service findBorrowerByName - getBorrowers took: ${getBorrowersDuration}ms`,
    // );

    // Filter client-side (Ensure 'Name' is the correct field for Borrowers)
    const foundBorrower = allBorrowers.find(
      (borrower) => borrower.Name === name, // Use .Name instead of ['Borrower Name']
    );
    // const filterDuration = Date.now() - startTime - getBorrowersDuration;
    // this.logger.log(
    //   `[Timer Debug] Service findBorrowerByName - filter took: ${filterDuration}ms`,
    // );

    if (foundBorrower) {
      this.logger.log(`Found borrower in cache/fetch: ${name}`);
      this.logger.log(
        `[SERVICE_RETURN] Returning borrower object: ${JSON.stringify(foundBorrower)}`,
      );
      return foundBorrower;
    }
    this.logger.log(`No borrower found in cache/fetch with name: ${name}`);
    this.logger.log(`[SERVICE_RETURN] Returning null`);
    return null;
  }

  // --- Refactor specific add methods ---
  async addTeacher(teacherData: any): Promise<any> {
    this.logger.log(`Adding Teacher: ${JSON.stringify(teacherData)}`);
    return this.addRecord('Teachers', teacherData);
  }

  async addBorrower(borrowerData: any): Promise<any> {
    this.logger.log(`Adding Borrower: ${JSON.stringify(borrowerData)}`);
    return this.addRecord('Borrowers', borrowerData);
  }

  async updateRecord(
    tableName: string,
    recordId: string,
    updateData: any,
  ): Promise<any> {
    this.logger.log(
      `Updating record in ${tableName}. ID: ${recordId}, Data: ${JSON.stringify(updateData)}`,
    );

    const requestBody = {
      Action: 'Edit',
      Properties: {
        Selector: `[ID] = '${recordId}'`,
      },
      Rows: [
        {
          ID: recordId,
          ...updateData,
        },
      ],
    };

    return this._callAppSheetApi(tableName, requestBody, 'Edit');
  }

  // Generic method to add a record
  async addRecord(tableName: string, recordData: any): Promise<any> {
    const requestBody = {
      Action: 'Add',
      Properties: {
        Locale: 'en-US', // Default locale
      },
      Rows: [
        recordData, // Assumes recordData matches table columns
      ],
    };
    // Use the helper, the return type might vary based on AppSheet response
    return this._callAppSheetApi<any>(tableName, requestBody, 'Add');
  }
}
