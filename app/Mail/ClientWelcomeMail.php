<?php

namespace App\Mail;

use App\Models\Bill;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ClientWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @var array<int, Bill>
     */
    public array $paidBills;

    public function __construct(
        public User $user,
        array|Collection $paidBills,
    ) {
        $this->paidBills = $paidBills instanceof Collection
            ? $paidBills->values()->all()
            : $paidBills;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenue parmi nos clients - Centre Zawaj Maroc',
        );
    }

    public function content(): Content
    {
        $primaryBill = $this->paidBills[0] ?? null;

        return new Content(
            view: 'emails.client-welcome',
            with: [
                'bill' => $primaryBill,
                'matchmaker' => $this->user->assignedMatchmaker
                    ?? $primaryBill?->matchmaker,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];

        foreach ($this->paidBills as $bill) {
            $attachments[] = $this->makeBillPdfAttachment($bill);
        }

        return $attachments;
    }

    private function makeBillPdfAttachment(Bill $bill): Attachment
    {
        return Attachment::fromData(
            function () use ($bill) {
                $bill->loadMissing(['user', 'profile', 'matchmaker']);

                $pdf = Pdf::loadView('pdf.invoice', ['bill' => $bill]);
                $pdf->setPaper('A4', 'portrait');
                $pdf->setOption('enable-smart-shrinking', true);
                $pdf->setOption('page-break-inside', 'avoid');

                return $pdf->output();
            },
            $bill->bill_number.'.pdf',
        )->withMime('application/pdf');
    }
}
