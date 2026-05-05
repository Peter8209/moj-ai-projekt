import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DefenseSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

type DefensePptxRequestBody = {
  title?: unknown;
  defenseType?: unknown;
  slides?: unknown;
};

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeFileName(value: string): string {
  const safe = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return safe || 'obhajoba';
}

function normalizeSlide(value: unknown, index: number): DefenseSlide {
  const item = value as Partial<DefenseSlide>;

  const title = cleanText(item.title || `Snímka ${index + 1}`);

  const bullets = Array.isArray(item.bullets)
    ? item.bullets
        .map((bullet: unknown) => cleanText(bullet))
        .filter((bullet: string) => bullet.length > 0)
    : [];

  const speakerNotes = item.speakerNotes
    ? cleanText(item.speakerNotes)
    : undefined;

  return {
    title,
    bullets,
    speakerNotes,
  };
}

function addFooter(slide: pptxgen.Slide, slideNumber: number) {
  slide.addText(String(slideNumber), {
    x: 0.55,
    y: 7.0,
    w: 0.5,
    h: 0.25,
    fontFace: 'Arial',
    fontSize: 9,
    color: '9CA3AF',
    margin: 0,
  });

  slide.addText('ZEDPERA', {
    x: 11.5,
    y: 7.0,
    w: 1.2,
    h: 0.25,
    fontFace: 'Arial',
    fontSize: 9,
    bold: true,
    color: '9333EA',
    margin: 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DefensePptxRequestBody;

    const title = cleanText(body.title || 'Obhajoba práce');
    const defenseType = cleanText(body.defenseType || 'Obhajoba');

    const rawSlides = Array.isArray(body.slides) ? body.slides : [];

    const slides: DefenseSlide[] = rawSlides
      .map((slide: unknown, index: number): DefenseSlide =>
        normalizeSlide(slide, index)
      )
      .filter(
        (slide: DefenseSlide): boolean =>
          slide.title.length > 0 || slide.bullets.length > 0
      );

    if (!slides.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýbajú slidy na export.',
        },
        { status: 400 }
      );
    }

    const pptx = new pptxgen();

    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'ZEDPERA';
    pptx.company = 'ZEDPERA';
    pptx.subject = defenseType;
    pptx.title = title;

    pptx.theme = {
      headFontFace: 'Arial',
      bodyFontFace: 'Arial',
    };

    // =====================================================
    // COVER SLIDE
    // =====================================================

    const cover = pptx.addSlide();

    cover.background = { color: '12051F' };

    cover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
      fill: { color: '12051F' },
      line: { color: '12051F' },
    });

    cover.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.16,
      fill: { color: '9333EA' },
      line: { color: '9333EA' },
    });

    cover.addText('ZEDPERA', {
      x: 0.7,
      y: 0.45,
      w: 2.4,
      h: 0.4,
      fontFace: 'Arial',
      fontSize: 16,
      bold: true,
      color: 'C084FC',
      margin: 0,
    });

    cover.addText(defenseType, {
      x: 0.7,
      y: 1.25,
      w: 11.5,
      h: 0.4,
      fontFace: 'Arial',
      fontSize: 18,
      color: 'E9D5FF',
      margin: 0,
    });

    cover.addText(title, {
      x: 0.7,
      y: 1.85,
      w: 11.6,
      h: 1.8,
      fontFace: 'Arial',
      fontSize: 34,
      bold: true,
      color: 'FFFFFF',
      fit: 'shrink',
      margin: 0,
      breakLine: false,
    });

    cover.addText('Prezentácia na obhajobu záverečnej práce', {
      x: 0.7,
      y: 4.9,
      w: 11.5,
      h: 0.4,
      fontFace: 'Arial',
      fontSize: 16,
      color: 'CBD5E1',
      margin: 0,
    });

    cover.addText('Vygenerované systémom ZEDPERA', {
      x: 0.7,
      y: 6.85,
      w: 11.5,
      h: 0.3,
      fontFace: 'Arial',
      fontSize: 10,
      color: '94A3B8',
      margin: 0,
    });

    // =====================================================
    // CONTENT SLIDES
    // =====================================================

    slides.forEach((item: DefenseSlide, index: number) => {
      const slide = pptx.addSlide();

      slide.background = { color: 'FFFFFF' };

      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 0.18,
        fill: { color: '9333EA' },
        line: { color: '9333EA' },
      });

      slide.addText(`Slide ${index + 1}`, {
        x: 0.55,
        y: 0.35,
        w: 1.5,
        h: 0.25,
        fontFace: 'Arial',
        fontSize: 9,
        color: '9333EA',
        bold: true,
        margin: 0,
      });

      slide.addText(cleanText(item.title || `Snímka ${index + 1}`), {
        x: 0.55,
        y: 0.75,
        w: 12.1,
        h: 0.65,
        fontFace: 'Arial',
        fontSize: 28,
        bold: true,
        color: '111827',
        fit: 'shrink',
        margin: 0,
      });

      const bullets = Array.isArray(item.bullets)
        ? item.bullets
            .map((bullet: unknown) => cleanText(bullet))
            .filter((bullet: string) => bullet.length > 0)
        : [];

      if (bullets.length > 0) {
        const bulletText = bullets
          .map((bullet: string) => `• ${bullet}`)
          .join('\n');

        slide.addText(bulletText, {
          x: 0.9,
          y: 1.75,
          w: 11.7,
          h: 3.8,
          fontFace: 'Arial',
          fontSize: 18,
          color: '1F2937',
          fit: 'shrink',
          breakLine: false,
          margin: 0.05,
          valign: 'top',
          paraSpaceAfter: 10,
        });
      } else {
        slide.addText('Bez doplnených bodov.', {
          x: 0.9,
          y: 1.75,
          w: 11.7,
          h: 0.4,
          fontFace: 'Arial',
          fontSize: 16,
          italic: true,
          color: '6B7280',
          margin: 0,
        });
      }

      if (item.speakerNotes) {
        slide.addText(`Poznámka: ${cleanText(item.speakerNotes)}`, {
          x: 0.65,
          y: 6.45,
          w: 12,
          h: 0.35,
          fontFace: 'Arial',
          fontSize: 9,
          italic: true,
          color: '6B7280',
          fit: 'shrink',
          margin: 0,
        });
      }

      addFooter(slide, index + 1);
    });

    const buffer = (await pptx.write({
      outputType: 'nodebuffer',
    })) as Buffer;

    const fileName = `${safeFileName(title)}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('PPTX_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Nepodarilo sa exportovať PowerPoint.',
      },
      { status: 500 }
    );
  }
}