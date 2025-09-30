<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $name;
    public string $email;
    public string $password;
    public string $role;

    public function __construct(string $name, string $email, string $password, string $role)
    {
        $this->name = $name;
        $this->email = $email;
        $this->password = $password;
        $this->role = $role;
    }

    public function build(): self
    {
        return $this
            ->subject('Your Staff Account Credentials')
            ->view('emails.staff-credentials')
            ->with([
                'name' => $this->name,
                'email' => $this->email,
                'password' => $this->password,
                'role' => $this->role,
            ]);
    }
}


