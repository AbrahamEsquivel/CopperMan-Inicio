import Phaser from 'phaser';

export class Enemigo extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'soldado', 'inactivo1');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuración Física
        this.setOrigin(0.5, 1);
        this.body.setSize(40, 60);
        this.body.setOffset(44, 68);
        this.setCollideWorldBounds(true);
        this.setBounce(0.1);
        
        // Estética (Rojo)
        this.setTint(0xff5555);

        // Variables
        this.vida = 3;
        this.velocidad = 80;
        this.rangoVision = 400; // A qué distancia te ve
        this.isDead = false;
    }

    update(jugador) {
        if (this.isDead || !this.body) return;

        // Calcular distancia
        const distancia = Phaser.Math.Distance.Between(this.x, this.y, jugador.x, jugador.y);

        // Lógica de Persecución
        if (distancia < this.rangoVision && jugador.vidaActual > 0) {
            if (this.x > jugador.x) {
                this.setVelocityX(-this.velocidad);
                this.setFlipX(true);
            } else {
                this.setVelocityX(this.velocidad);
                this.setFlipX(false);
            }
            this.anims.play('walk', true);
        } else {
            this.setVelocityX(0);
            this.anims.play('idle', true);
        }
    }

    recibirDaño() {
        if (this.isDead) return;

        this.vida--;

        // Feedback visual (parpadeo blanco)
        this.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.setTint(0xff5555); // Volver a rojo si sigue vivo
        });

        if (this.vida <= 0) {
            this.morir();
        }
    }

    morir() {
        this.isDead = true;
        this.body.enable = false; // Desactivar física
        this.setTint(0xffffff);   // Quitar color rojo al morir
        this.anims.play('dead', true);
        
        this.on('animationcomplete-dead', () => {
            this.destroy();
        });
    }
}