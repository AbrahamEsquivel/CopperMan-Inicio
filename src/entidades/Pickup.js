import Phaser from 'phaser';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, tipo) {
        
        // 1. Decidir qué textura usar según el tipo
        let textureKey;
        if (tipo === 'ammo') {
            textureKey = 'icono_municion';
        } else {
            textureKey = 'icono_vida';
        }

        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.tipo = tipo;

        // 2. HACER EL HITBOX MÁS GRANDE QUE EL DIBUJO
        // Aunque la imagen sea de 32px, el hitbox será de 50px
        this.body.setSize(50, 50); 
        
        // 3. CENTRAR EL HITBOX (Para que crezca desde el centro)
        // Offset negativo para centrarlo respecto al sprite
        this.body.setOffset(-9, -9); 

        // 4. EVITAR QUE LA ANIMACIÓN LO ENTIERRE
        // Haremos que flote SÓLO hacia arriba (y: y - 5) en lugar de oscilar tanto
        this.setCollideWorldBounds(true);
        this.setBounce(0.3); // Un rebotito al caer

        // Guardamos la Y inicial como referencia
        this.startY = y;

        // Animación corregida: Más suave y solo hacia arriba
        scene.tweens.add({
            targets: this,
            y: '-=10', // Subir 10px desde donde esté
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Desaparecer después de 15 segundos
        scene.time.delayedCall(15000, () => {
            if (this.active) this.destroy();
        });
    }
}