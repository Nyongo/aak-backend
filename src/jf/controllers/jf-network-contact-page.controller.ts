import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { JFNetworkContactPageService } from '../services/jf-network-contact-page.service';
import { CreateJFNetworkContactPageDto, UpdateJFNetworkContactPageDto } from '../dto/jf-network-contact-page.dto';


@Controller('jf/network-contact-page')
export class JFNetworkContactPageController {
  constructor(private readonly service: JFNetworkContactPageService) {}

  @Post()
  create(@Body() dto: CreateJFNetworkContactPageDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJFNetworkContactPageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}