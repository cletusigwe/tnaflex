<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_view_authentication_pages(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn (Assert $page): Assert => $page->component('auth/login'));

        $this->get(route('register'))
            ->assertOk()
            ->assertInertia(fn (Assert $page): Assert => $page->component('auth/register'));
    }

    public function test_guest_can_register_with_username_and_password(): void
    {
        $response = $this->post(route('register.store'), [
            'username' => 'New_Creator',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::query()->where('username', 'new_creator')->firstOrFail();

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $response = $this->from(route('register'))->post(route('register.store'), [
            'username' => 'New_Creator',
            'password' => 'password',
            'password_confirmation' => 'different-password',
        ]);

        $response->assertRedirect(route('register'));
        $response->assertSessionHasErrors('password');
        $this->assertGuest();
    }

    public function test_seeded_user_can_log_in_with_username_and_password(): void
    {
        $this->seed();

        $response = $this->post(route('login.store'), [
            'username' => 'tnaflexer',
            'password' => 'password',
        ]);

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs(User::query()->where('username', 'tnaflexer')->firstOrFail());
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'username' => 'tnajoy',
            'password' => 'password',
        ]);

        $response = $this->from(route('login'))->post(route('login.store'), [
            'username' => 'tnajoy',
            'password' => 'wrong-password',
        ]);

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }

    public function test_authenticated_user_can_log_out(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('logout'));

        $response->assertRedirect(route('home'));
        $this->assertGuest();
    }
}
