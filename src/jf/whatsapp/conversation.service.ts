import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { ZohoCrmService } from '../services/zoho-crm.service';
import { CreateLeadDto } from '../dto/create-lead.dto';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  // Conversation states
  private readonly STATES = {
    INITIAL: 'initial',
    COLLECT_NAME: 'collect_name',
    VERIFY_PHONE: 'verify_phone',
    COLLECT_EMAIL: 'collect_email',
    SELECT_TYPE: 'select_type',
    CHECK_REGISTRATION: 'check_registration',
    CHECK_LOGBOOK: 'check_logbook',
    COLLECT_BUSINESS_NAME: 'collect_business_name',
    COLLECT_BUSINESS_TYPE: 'collect_business_type',
    COLLECT_REGION: 'collect_region',
    COLLECT_YEARS: 'collect_years',
    CHECK_STATEMENTS: 'check_statements',
    COLLECT_LOAN_AMOUNT: 'collect_loan_amount',
    COLLECT_LOAN_PURPOSE: 'collect_loan_purpose',
    CONFIRMATION: 'confirmation',
    INELIGIBLE: 'ineligible',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly zohoCrmService: ZohoCrmService,
  ) {}

  /**
   * Handle incoming message from WhatsApp
   */
  async handleIncomingMessage(
    phoneNumber: string,
    messageText: string,
  ): Promise<void> {
    try {
      // Get or create conversation
      let conversation = await this.prisma.whatsAppConversation.findUnique({
        where: { phoneNumber },
      });

      if (!conversation) {
        conversation = await this.prisma.whatsAppConversation.create({
          data: {
            phoneNumber,
            state: this.STATES.INITIAL,
            data: {},
          },
        });
      }

      // Process message based on current state
      await this.processMessage(conversation, messageText);
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
      throw error;
    }
  }

  /**
   * Process message based on conversation state
   */
  private async processMessage(
    conversation: any,
    messageText: string,
  ): Promise<void> {
    const { state } = conversation;
    const normalizedText = messageText.trim().toLowerCase();
    const data = conversation.data as any;

    switch (state) {
      case this.STATES.INITIAL:
        await this.handleInitial(conversation, normalizedText);
        break;

      case this.STATES.COLLECT_NAME:
        await this.handleName(conversation, messageText);
        break;

      case this.STATES.VERIFY_PHONE:
        await this.handlePhoneVerification(conversation, normalizedText);
        break;

      case this.STATES.COLLECT_EMAIL:
        await this.handleEmail(conversation, messageText);
        break;

      case this.STATES.SELECT_TYPE:
        await this.handleTypeSelection(conversation, normalizedText);
        break;

      case this.STATES.CHECK_REGISTRATION:
        await this.handleRegistrationCheck(conversation, normalizedText);
        break;

      case this.STATES.CHECK_LOGBOOK:
        await this.handleLogbookCheck(conversation, normalizedText);
        break;

      case this.STATES.COLLECT_BUSINESS_NAME:
        await this.handleBusinessName(conversation, messageText);
        break;

      case this.STATES.COLLECT_BUSINESS_TYPE:
        await this.handleBusinessType(conversation, normalizedText);
        break;

      case this.STATES.COLLECT_REGION:
        await this.handleRegion(conversation, messageText);
        break;

      case this.STATES.COLLECT_YEARS:
        await this.handleYears(conversation, messageText);
        break;

      case this.STATES.CHECK_STATEMENTS:
        await this.handleStatementsCheck(conversation, normalizedText);
        break;

      case this.STATES.COLLECT_LOAN_AMOUNT:
        await this.handleLoanAmount(conversation, messageText);
        break;

      case this.STATES.COLLECT_LOAN_PURPOSE:
        await this.handleLoanPurpose(conversation, messageText);
        break;

      case this.STATES.CONFIRMATION:
      case this.STATES.INELIGIBLE:
        // Conversation ended, restart if user says hello
        if (
          normalizedText === 'hello' ||
          normalizedText === 'hi' ||
          normalizedText === 'hey'
        ) {
          await this.sendWelcome(conversation);
        } else {
          await this.whatsappService.sendMessage(
            conversation.phoneNumber,
            "To start a new application, please say 'Hello'",
          );
        }
        break;

      default:
        await this.whatsappService.sendMessage(
          conversation.phoneNumber,
          "I'm not sure how to help with that. Please start over by saying 'Hello'.",
        );
    }
  }

  // State handlers
  private async handleInitial(conversation: any, text: string): Promise<void> {
    if (text === 'hello' || text === 'hi' || text === 'hey') {
      await this.sendWelcome(conversation);
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "👋 Hi! To get started, please say 'Hello'",
      );
    }
  }

  private async sendWelcome(conversation: any): Promise<void> {
    const message = `👋 Hi there! Welcome to Jackfruit Finance. I'm your virtual assistant, here to help you get started with a loan application.

To create a lead for our team to follow up on, please give us a few quick details.

What is your full name?`;

    await this.whatsappService.sendMessage(conversation.phoneNumber, message);
    await this.updateConversationState(conversation.id, this.STATES.COLLECT_NAME);
  }

  private async handleName(conversation: any, name: string): Promise<void> {
    if (name.length < 2) {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide your full name (at least 2 characters).',
      );
      return;
    }

    const data = (conversation.data as any) || {};
    data.fullName = name;

    const phoneNumber = conversation.phoneNumber;
    const formattedPhone = this.whatsappService.formatPhoneNumber(phoneNumber);

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      `Great! Your phone number appears to be ${formattedPhone}. Is this correct? (Yes/No)`,
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.VERIFY_PHONE,
      data,
    );
  }

  private async handlePhoneVerification(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text === 'yes' || text === 'y' || text === 'correct') {
      data.phone = conversation.phoneNumber;

      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Would you like to provide an email address for follow-ups? (Optional - Reply 'Skip' to continue)",
      );

      await this.updateConversationState(
        conversation.id,
        this.STATES.COLLECT_EMAIL,
        data,
      );
    } else if (text === 'no' || text === 'n') {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide your correct phone number:',
      );
      // Could add a state to collect phone number
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Please reply with 'Yes' or 'No'",
      );
    }
  }

  private async handleEmail(conversation: any, text: string): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text.toLowerCase() === 'skip') {
      data.email = null;
    } else if (this.isValidEmail(text)) {
      data.email = text;
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Please provide a valid email address or reply 'Skip' to continue.",
      );
      return;
    }

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      `Are you an:

1️⃣ SME (Small/Medium Enterprise)
2️⃣ School Director

Please reply with 1 or 2`,
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.SELECT_TYPE,
      data,
    );
  }

  private async handleTypeSelection(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text === '1' || text === 'one') {
      data.customerType = 'SME';
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Is your business officially registered? (Yes/No)',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.CHECK_REGISTRATION,
        data,
      );
    } else if (text === '2' || text === 'two') {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'School Director flow coming soon!',
      );
      return;
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please reply with 1 or 2',
      );
      return;
    }
  }

  private async handleRegistrationCheck(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text === 'yes' || text === 'y') {
      data.businessRegistered = true;
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Do you have a car logbook? (Yes/No)',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.CHECK_LOGBOOK,
        data,
      );
    } else if (text === 'no' || text === 'n') {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Sorry, we currently only work with registered businesses. Please register your business and try again later.',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.INELIGIBLE,
        data,
      );
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Please reply with 'Yes' or 'No'",
      );
      return;
    }
  }

  private async handleLogbookCheck(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text === 'yes' || text === 'y') {
      data.hasLogbook = true;
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide your business details:\n\n📝 Business Name:',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.COLLECT_BUSINESS_NAME,
        data,
      );
    } else if (text === 'no' || text === 'n') {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Our current products require a car logbook as security. Please contact us when you have a logbook available.',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.INELIGIBLE,
        data,
      );
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Please reply with 'Yes' or 'No'",
      );
      return;
    }
  }

  private async handleBusinessName(
    conversation: any,
    text: string,
  ): Promise<void> {
    if (text.length < 2) {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide a valid business name.',
      );
      return;
    }

    const data = (conversation.data as any) || {};
    data.businessName = text;

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      `What type of business is this?

1️⃣ School Supplier
2️⃣ Service Provider
3️⃣ Transport
4️⃣ Other

Please reply with 1, 2, 3, or 4`,
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.COLLECT_BUSINESS_TYPE,
      data,
    );
  }

  private async handleBusinessType(
    conversation: any,
    text: string,
  ): Promise<void> {
    const types: Record<string, string> = {
      '1': 'School Supplier',
      '2': 'Service Provider',
      '3': 'Transport',
      '4': 'Other',
    };

    const data = (conversation.data as any) || {};

    if (types[text]) {
      data.businessType = types[text];
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Which region does your business operate in?',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.COLLECT_REGION,
        data,
      );
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please reply with 1, 2, 3, or 4',
      );
      return;
    }
  }

  private async handleRegion(conversation: any, text: string): Promise<void> {
    const data = (conversation.data as any) || {};
    data.region = text;

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      'How many years has your business been in operation?',
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.COLLECT_YEARS,
      data,
    );
  }

  private async handleYears(conversation: any, text: string): Promise<void> {
    const years = parseInt(text);
    if (isNaN(years) || years < 0) {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide a valid number of years.',
      );
      return;
    }

    const data = (conversation.data as any) || {};
    data.yearsInOperation = years;

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      'Do you have your bank/M-Pesa statements available? (Yes/No)',
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.CHECK_STATEMENTS,
      data,
    );
  }

  private async handleStatementsCheck(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};

    if (text === 'yes' || text === 'y') {
      data.hasStatements = true;
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'What loan amount are you looking for? (in KES)',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.COLLECT_LOAN_AMOUNT,
        data,
      );
    } else if (text === 'no' || text === 'n') {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please gather your financial statements and try again.',
      );
      await this.updateConversationState(
        conversation.id,
        this.STATES.INELIGIBLE,
        data,
      );
    } else {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        "Please reply with 'Yes' or 'No'",
      );
      return;
    }
  }

  private async handleLoanAmount(
    conversation: any,
    text: string,
  ): Promise<void> {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'Please provide a valid loan amount in KES.',
      );
      return;
    }

    const data = (conversation.data as any) || {};
    data.loanAmount = amount;

    await this.whatsappService.sendMessage(
      conversation.phoneNumber,
      'What is the purpose of this loan?',
    );

    await this.updateConversationState(
      conversation.id,
      this.STATES.COLLECT_LOAN_PURPOSE,
      data,
    );
  }

  private async handleLoanPurpose(
    conversation: any,
    text: string,
  ): Promise<void> {
    const data = (conversation.data as any) || {};
    data.loanPurpose = text;

    // Create lead in Zoho CRM
    try {
      const leadDto = this.buildLeadDto(data);
      const result = await this.zohoCrmService.createLead(leadDto);

      const summary = `✅ Thanks! Your application has been submitted for review.

📋 Summary:
• Name: ${data.fullName}
• Business: ${data.businessName}
• Amount: KES ${data.loanAmount.toLocaleString()}
• Purpose: ${data.loanPurpose}

A representative will be in touch with you within 24 hours.`;

      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        summary,
      );

      await this.updateConversationState(
        conversation.id,
        this.STATES.CONFIRMATION,
        { ...data, leadId: result.id },
      );
    } catch (error) {
      this.logger.error('Error creating lead:', error);
      await this.whatsappService.sendMessage(
        conversation.phoneNumber,
        'There was an error submitting your application. Please try again later or contact us directly.',
      );
    }
  }

  /**
   * Build CreateLeadDto from conversation data
   */
  private buildLeadDto(data: any): CreateLeadDto {
    return {
      name: data.fullName || '',
      email: data.email || undefined,
      phone: data.phone || undefined,
      company: data.businessName || undefined,
      industry: data.businessType || undefined,
      message: `Loan Purpose: ${data.loanPurpose || ''}\nLoan Amount: KES ${data.loanAmount || ''}\nRegion: ${data.region || ''}\nYears in Operation: ${data.yearsInOperation || ''}`,
      source: 'whatsapp_bot',
      leadStatus: 'New',
      city: data.region || undefined,
    };
  }

  /**
   * Update conversation state
   */
  private async updateConversationState(
    conversationId: string,
    state: string,
    data?: any,
  ): Promise<void> {
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        state,
        data: data || undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
