<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProspectCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $name;
    public string $email;
    public string $password;

    public function __construct(string $name, string $email, string $password)
    {
        $this->name = $name;
        $this->email = $email;
        $this->password = $password;
    }

    public function build(): self
    {
        return $this
            ->subject('Vos identifiants de compte - Centre Zawaj Maroc')
            ->view('emails.prospect-credentials')
            ->with([
                'name' => $this->name,
                'email' => $this->email,
                'password' => $this->password,
            ]);
    }
}

