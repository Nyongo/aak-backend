import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  CreateRouteDto,
  UpdateRouteDto,
  AddRouteStudentDto,
  RemoveRouteStudentDto,
  BulkAddRouteStudentsDto,
  BulkRemoveRouteStudentsDto,
  RiderType,
} from '../dto/create-route.dto';
import { RouteDbService } from '../services/route-db.service';

@Controller('academic-suite/routes')
export class RouteController {
  constructor(private readonly routeDb: RouteDbService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateRouteDto) {
    try {
      // Check if route name already exists for this school
      const existingRoute = await this.routeDb.findByName(
        dto.name,
        dto.schoolId,
      );
      if (existingRoute) {
        return {
          success: false,
          error: 'Route with this name already exists for this school',
        };
      }

      const created = await this.routeDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create route',
      };
    }
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('schoolId') schoolId?: string,
  ) {
    try {
      const p = Number(page) || 1;
      const ps = Number(pageSize) || 10;
      const result = await this.routeDb.findAll(p, ps, schoolId);
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch routes',
      };
    }
  }

  @Get('statistics')
  async getStatistics() {
    try {
      const statistics = await this.routeDb.getRouteStatistics();
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch route statistics',
      };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      const route = await this.routeDb.findById(id);
      if (!route) {
        return { success: false, message: 'Route not found' };
      }
      return { success: true, data: route };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch route',
      };
    }
  }

  @Get(':id/students')
  async getRouteStudents(
    @Param('id') id: string,
    @Query('riderType') riderType?: string,
  ) {
    try {
      const route = await this.routeDb.findById(id);
      if (!route) {
        return { success: false, error: 'Route not found' };
      }

      const validRiderType =
        riderType && Object.values(RiderType).includes(riderType as RiderType)
          ? (riderType as RiderType)
          : undefined;

      const students = await this.routeDb.getRouteStudents(id, validRiderType);
      return { success: true, data: students };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch route students',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    try {
      // Check if route exists
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      // Check if route name is being changed and already exists for this school
      if (dto.name && dto.name !== existingRoute.name) {
        const routeWithSameName = await this.routeDb.findByName(
          dto.name,
          dto.schoolId || existingRoute.schoolId,
        );
        if (routeWithSameName) {
          return {
            success: false,
            error: 'Route with this name already exists for this school',
          };
        }
      }

      const updated = await this.routeDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update route',
      };
    }
  }

  @Post(':id/students')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addStudent(@Param('id') id: string, @Body() dto: AddRouteStudentDto) {
    try {
      // Check if route exists
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      const routeStudent = await this.routeDb.addStudent(id, dto);
      return { success: true, data: routeStudent };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add student to route',
      };
    }
  }

  @Post(':id/students/bulk')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async bulkAddStudents(
    @Param('id') id: string,
    @Body() dto: BulkAddRouteStudentsDto,
  ) {
    try {
      // Check if route exists
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      const result = await this.routeDb.bulkAddStudents(id, dto);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to bulk add students to route',
      };
    }
  }

  @Delete(':id/students/bulk')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async bulkRemoveStudents(
    @Param('id') id: string,
    @Body() dto: BulkRemoveRouteStudentsDto,
  ) {
    try {
      // Check if route exists
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      const result = await this.routeDb.bulkRemoveStudents(id, dto);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to bulk remove students from route',
      };
    }
  }

  @Delete(':id/students/:studentId')
  async removeStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    try {
      // Check if route exists
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      const result = await this.routeDb.removeStudent(id, studentId);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove student from route',
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const existingRoute = await this.routeDb.findById(id);
      if (!existingRoute) {
        return { success: false, error: 'Route not found' };
      }

      const deleted = await this.routeDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete route',
      };
    }
  }
}
