<?php

namespace App\Mail;

use App\Models\PostComment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommentReplyNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $reply;
    public $parentComment;
    public $replier;

    /**
     * Create a new message instance.
     */
    public function __construct(PostComment $reply, PostComment $parentComment, User $replier)
    {
        $this->reply = $reply;
        $this->parentComment = $parentComment;
        $this->replier = $replier;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouvelle réponse à votre commentaire - Centre Zawaj Maroc',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.comment-reply',
            with: [
                'reply' => $this->reply,
                'parentComment' => $this->parentComment,
                'replier' => $this->replier,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
