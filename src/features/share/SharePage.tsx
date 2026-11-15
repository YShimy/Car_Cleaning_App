import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/toast';
import { BRAND } from '@/config/brand';

/** A QR code of this demo's address, to hand a phone to an interviewee quickly. */
export default function SharePage() {
  // The app's own address without the #/route part.
  const url = `${window.location.origin}${window.location.pathname}`;
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Generated in the browser: the address is never sent to a QR service.
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => !cancelled && setSvg(''));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.show('Copy the link from the address bar.');
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <BrandMark size="lg" />
      <div>
        <h1 className="text-2xl">Open the demo on your phone</h1>
        <p className="text-ink-2 mt-1">Point your camera at the code.</p>
      </div>
      <Card className="w-full max-w-xs p-5">
        <div
          role="img"
          aria-label={`QR code for ${url}`}
          className="aspect-square w-full [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </Card>
      <p className="text-ink-2 text-sm break-all">{url}</p>
      <div className="no-print flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={copy}>
          Copy link
        </Button>
        <Link
          to="/"
          className="text-primary inline-flex min-h-12 items-center px-3 font-medium underline underline-offset-2"
        >
          Back to the launcher
        </Link>
      </div>
      <p className="text-ink-2 text-xs">{BRAND.name} · Interactive demo with fictional data.</p>
    </main>
  );
}
