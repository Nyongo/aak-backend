import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateJFNetworkContactPageDto,
  UpdateJFNetworkContactPageDto,
} from '../dto/jf-network-contact-page.dto';
import { MessageType, Platform } from '@prisma/client';

@Injectable()
export class JFNetworkContactPageService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateJFNetworkContactPageDto) {
    const normalized = {
      ...data,
      messageType: this.normalizeMessageType(data.messageType),
      platform: this.normalizePlatform(data.platform),
    };
    return this.prisma.contactMessage.create({ data: normalized });
  }

  findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.contactMessage.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateJFNetworkContactPageDto) {
    const normalized: UpdateJFNetworkContactPageDto = {
      ...data,
      messageType:
        data.messageType !== undefined
          ? this.normalizeMessageType(data.messageType)
          : undefined,
      platform:
        data.platform !== undefined
          ? this.normalizePlatform(data.platform)
          : undefined,
    };
    return this.prisma.contactMessage.update({
      where: { id },
      data: normalized,
    });
  }

  remove(id: string) {
    return this.prisma.contactMessage.delete({ where: { id } });
  }
}

// Helpers
function normalizeKey(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const MESSAGE_TYPE_ALIASES: Record<string, MessageType> = {
  NORMAL: MessageType.GENERAL_INQUIRY,
  GENERAL: MessageType.GENERAL_INQUIRY,
  QUERY: MessageType.GENERAL_INQUIRY,
  SUPPORT: MessageType.SUPPORT_REQUEST,
  PARTNERSHIP: MessageType.PARTNERSHIP_INQUIRY,
  FEEDBACK: MessageType.FEEDBACK,
};

const PLATFORM_ALIASES: Record<string, Platform> = {
  JF_NETWORK: Platform.WEBSITE,
  WEB: Platform.WEBSITE,
  SITE: Platform.WEBSITE,
  APP: Platform.MOBILE_APP,
  MOBILE: Platform.MOBILE_APP,
  PHONE: Platform.PHONE,
  EMAIL: Platform.EMAIL,
  API: Platform.API,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace EnumNormalizers {
  export function toMessageType(value: string | MessageType): MessageType {
    if (typeof value !== 'string') return value;
    const key = normalizeKey(value);
    if (key in MESSAGE_TYPE_ALIASES) return MESSAGE_TYPE_ALIASES[key];
    if (key in MessageType) return (MessageType as any)[key] as MessageType;
    throw new BadRequestException(`Invalid messageType: ${value}`);
  }

  export function toPlatform(value: string | Platform): Platform {
    if (typeof value !== 'string') return value;
    const key = normalizeKey(value);
    if (key in PLATFORM_ALIASES) return PLATFORM_ALIASES[key];
    if (key in Platform) return (Platform as any)[key] as Platform;
    throw new BadRequestException(`Invalid platform: ${value}`);
  }
}

// Bind methods on the service for DI friendliness
// Using instance methods to keep code readable in create/update above
// while reusing the pure functions defined in the namespace.
export interface JFNetworkContactPageService {
  normalizeMessageType(value: string | MessageType): MessageType;
  normalizePlatform(value: string | Platform): Platform;
}

JFNetworkContactPageService.prototype.normalizeMessageType = function (
  value: string | MessageType,
): MessageType {
  return EnumNormalizers.toMessageType(value);
};

JFNetworkContactPageService.prototype.normalizePlatform = function (
  value: string | Platform,
): Platform {
  return EnumNormalizers.toPlatform(value);
};
