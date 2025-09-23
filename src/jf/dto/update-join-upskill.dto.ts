import { PartialType } from '@nestjs/mapped-types';
import { CreateJoinUpskillDto } from './create-join-upskill.dto';

export class UpdateJoinUpskillDto extends PartialType(CreateJoinUpskillDto) {}
// makes all fields optional by extending CreateJoinUpskillDto