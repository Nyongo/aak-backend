import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { JoinUpskillService } from '../services/join-upskill.service';
import { CreateJoinUpskillDto } from '../dto/create-join-upskill.dto';
import { UpdateJoinUpskillDto } from '../dto/update-join-upskill.dto';


@Controller('jf/join-upskill-application')
export class JoinUpskillController {
  constructor(private readonly service: JoinUpskillService) {}

  @Post('')
  create(@Body() dto: CreateJoinUpskillDto) {
    return this.service.create(dto);
  }

  @Get('')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJoinUpskillDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
