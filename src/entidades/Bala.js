// Bala.js
import Phaser from 'phaser';

export class Bala extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Sprite básico; el grupo de físicas gestiona el body
        super(scene, x, y, 'bala');
    }

    // Este método se llama cuando el jugador dispara
    fire(x, y, angulo) {
        // activar y posicionar. Acepta parámetros opcionales: velocidad y gravedad
        const args = Array.from(arguments);
        const speed = (args.length >= 4 && typeof args[3] === 'number') ? args[3] : 900;
        const useGravity = (args.length >= 5 && typeof args[4] === 'boolean') ? args[4] : false;

        this.setActive(true);
        this.setVisible(true);
        if (this.body) {
            this.body.enable = true;
            this.body.allowGravity = !!useGravity;
        }
        this.setPosition(x, y);
        this.setRotation(angulo);
        this.scene.physics.velocityFromRotation(angulo, speed, this.body.velocity);
        this.lifespan = 2000;
    }

    // Este método se ejecuta automáticamente en cada frame gracias a runChildUpdate
    update(time, delta) {
        // Si la bala no está activa, no gastamos CPU
        if (!this.active) return;

        // Restar vida
        this.lifespan -= delta;

        // Si se acaba el tiempo, "matar" la bala
        if (this.lifespan <= 0) {
            this.deactivate();
        }

        // Opcional: Si sale de la pantalla también la matamos (para seguridad extra)
        // if (!this.scene.cameras.main.worldView.contains(this.x, this.y)) {
        //    this.deactivate();
        // }
    }

    deactivate() {
        this.setActive(false);
        this.setVisible(false);
        this.body.stop(); // Frenar velocidad
        this.body.enable = false; // Apagar colisiones (¡Importante!)
    }
}