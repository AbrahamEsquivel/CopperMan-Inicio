import Phaser from 'phaser';

export class Jugador extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // Llamamos al constructor del padre (Sprite)
        super(scene, x, y, 'soldado', 'inactivo1');

        // 1. Agregarlo a la escena y a las físicas
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 2. Configuración Física (Hitbox)
        this.setOrigin(0.5, 1);
        this.setScale(1);
        this.setBounce(0.1);
        this.setCollideWorldBounds(true);
        this.body.setSize(40, 60);
        this.body.setOffset(44, 68);

        // 3. Variables PROPIAS del jugador
        this.vidaMax = 3;
        this.vidaActual = 3;
        this.stamina = 100;
        this.maxStamina = 100;
        this.municionActual = 30;
        this.municionMax = 30;
        
        this.velocidadCaminar = 100;
        this.velocidadCorrer = 250;
        
        this.isReloading = false;
        this.isShooting = false;
        this.esInvulnerable = false;

        // Referencia a las teclas (las pasaremos desde la escena)
        this.teclas = null;
        // inicializar handlers de animación
        this.initAnimationHandlers();
    }

    // Manejar fin de animaciones relevantes
    initAnimationHandlers() {
        this.on('animationcomplete-shoot', () => {
            this.isShooting = false;
        });

        this.on('animationcomplete-reload', () => {
            this.municionActual = this.municionMax;
            this.isReloading = false;
        });
    }

    // Método para asignar controles
    asignarControles(teclas) {
        this.teclas = teclas;
    }

    update() {
        // Si está muerto, no hace nada
        if (this.vidaActual <= 0) return;

        // --- LÓGICA DE STAMINA ---
        const estaCorriendoInput = this.teclas.shift.isDown && (this.teclas.left.isDown || this.teclas.right.isDown);
        if (!estaCorriendoInput && this.stamina < this.maxStamina) {
            this.stamina += 0.3;
        }

        // --- MOVIMIENTO ---
        if (this.esInvulnerable) {
            // Si nos golpearon, perdemos control momentáneo (Knockback)
        } else {
            this.movimientoNormal();
        }

        // --- ANIMACIONES ---
        this.gestionarAnimaciones();
    }

    movimientoNormal() {
        let velocidadActual = this.velocidadCaminar;

        // Correr
        if (this.teclas.shift.isDown && this.stamina > 0) {
            velocidadActual = this.velocidadCorrer;
            if (this.teclas.left.isDown || this.teclas.right.isDown) {
                this.stamina -= 0.5; // Costo correr
            }
        }

        // Izquierda / Derecha
        if (this.teclas.left.isDown) {
            this.setVelocityX(-velocidadActual);
            this.setFlipX(true);
        } else if (this.teclas.right.isDown) {
            this.setVelocityX(velocidadActual);
            this.setFlipX(false);
        } else {
            this.setVelocityX(0);
        }

        // Salto
        if ((this.teclas.up.isDown || this.teclas.space.isDown) && 
            this.body.touching.down && 
            this.stamina >= 20) {
            
            this.setVelocityY(-330);
            this.stamina -= 20;
        }
    }

    gestionarAnimaciones() {
        // Prioridades
        if (this.isReloading || this.isShooting) return;

        if (!this.body.touching.down) {
            // No animamos salto porque no tienes los frames, pero aquí iría
        } else if (this.body.velocity.x !== 0) {
            const anim = Math.abs(this.body.velocity.x) > 110 ? 'run' : 'walk';
            this.anims.play(anim, true);
        } else {
            this.anims.play('idle', true);
        }
    }

    // Aquí moveremos recibirDaño y disparar más adelante
    recibirDaño(enemigo) {
        if (this.esInvulnerable || this.vidaActual <= 0) return;
        
        // --- AGREGA ESTO AQUÍ ---
        // Si nos golpean, cancelamos cualquier acción en curso inmediatamente
        this.isShooting = false; 
        this.isReloading = false;
        // ------------------------

        this.vidaActual--;
        
        // Lógica de Knockback
        this.esInvulnerable = true;
        const dir = enemigo.x < this.x ? 1 : -1;
        this.setVelocityX(200 * dir);
        this.setVelocityY(-200);
        this.setTint(0xff0000);

        // Muerte
        if (this.vidaActual <= 0) {
            this.anims.play('dead', true);
            // Asegúrate de desactivar físicas al morir para que no lo sigan empujando
            this.setVelocityX(0); 
            // this.body.enable = false; // Opcional: si quieres que caiga y ya no choque
        } else {
            // Recuperarse
            this.scene.time.delayedCall(1000, () => {
                this.esInvulnerable = false;
                this.clearTint();
            });
        }
    }

    // En Jugador.js
    disparar(pointer, grupoBalas) {
        if (this.isReloading || this.isShooting || this.municionActual <= 0) return;

        // Orientación del sprite
        if (pointer.worldX < this.x) this.setFlipX(true);
        else this.setFlipX(false);

        this.isShooting = true;
        this.municionActual--;
        this.anims.play('shoot', true);
        
        // --- AQUÍ CAMBIA ---
        // Pedimos una bala al grupo. Si no hay disponibles (maxSize), nos devuelve null
        const offset = this.flipX ? -30 : 30;
        const spawnX = this.x + offset;
        const spawnY = this.y - 45;
        
        const angulo = Phaser.Math.Angle.Between(spawnX, spawnY, pointer.worldX, pointer.worldY);
        const bala = grupoBalas.get(spawnX, spawnY);
        if (!bala) return;
        
        // Si la bala tiene método `fire` (clase Bala), usarlo
        if (typeof bala.fire === 'function') {
            bala.fire(spawnX, spawnY, angulo);
        } else {
            // Fallback: activar y darle velocidad
            bala.setActive(true);
            bala.setVisible(true);
            if (bala.body) bala.body.enable = true;
            bala.setPosition(spawnX, spawnY);
            bala.setRotation(angulo);
            this.scene.physics.velocityFromRotation(angulo, 900, bala.body.velocity);
            this.scene.time.delayedCall(2000, () => {
                if (bala.deactivate) bala.deactivate(); else bala.setActive(false);
            });
        }
        
        // bala ya fue activada arriba (fire) o gestionada en el fallback
    }
}