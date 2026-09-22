import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.createDocument(file);
  }

  @Get()
  async getAllDocuments() {
    return this.documentsService.findAll();
  }
}
