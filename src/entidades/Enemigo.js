import Phaser from 'phaser';
import { Bala } from './Bala'; // Asegúrate de importar la Bala

export class Enemigo extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'soldado', 'inactivo1'); // Ajusta tu sprite inicial

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Configuración Física
        this.setOrigin(0.5, 1);
        // Usar hitbox similar al jugador para alinearlo visualmente
        this.body.setSize(40, 60);
        this.body.setOffset(44, 68);
        if (this.body) {
            this.body.allowGravity = true;
            this.body.checkCollision = { up: true, down: true, left: true, right: true };
        }
        this.setCollideWorldBounds(true);
        this.setBounce(0.1);
        this.setTint(0xff5555); // Color rojo para diferenciar

        // --- ESTADÍSTICAS ---
        this.vida = 3;
        this.velocidadPatrulla = 30; // Camina lento
        this.velocidadPersecucion = 70; // Corre rápido
        
        // --- IA (CEREBRO) ---
        this.rangoVision = 250;  // Distancia para verte
        this.rangoAtaque = 120;  // Distancia para disparar
        this.nextShot = 0;       // Cooldown de disparo
        this.fireRate = 2000;    // Dispara cada 2 segundos

        // PATRULLAJE
        this.distanciaPatrulla = 100; // Cuánto camina antes de dar la vuelta
        this.startX = x;              // Recordar dónde nació
        this.direccion = 1;           // 1 derecha, -1 izquierda

        this.isDead = false;
        
        // Referencia al grupo de balas (lo buscaremos en la escena)
        this.bulletsGroup = scene.balasEnemigos; 
    }

    update(jugador) {
        if (this.isDead || !this.body || !jugador || !jugador.active) return;

        // Calcular distancia al jugador
        const dist = Phaser.Math.Distance.Between(this.x, this.y, jugador.x, jugador.y);
        
        // MÁQUINA DE ESTADOS
        
        if (dist < this.rangoAtaque && jugador.vidaActual > 0) {
            // ESTADO 3: ATACAR (Disparar)
            this.estadoAtacar(jugador);
        
        } else if (dist < this.rangoVision && jugador.vidaActual > 0) {
            // ESTADO 2: PERSEGUIR
            this.estadoPerseguir(jugador);
        
        } else {
            // ESTADO 1: PATRULLAR
            this.estadoPatrullar();
        }
    }

    estadoPatrullar() {
        // Moverse de un lado a otro respecto a su punto de inicio (startX)
        if (this.x > this.startX + this.distanciaPatrulla) {
            this.direccion = -1;
        } else if (this.x < this.startX - this.distanciaPatrulla) {
            this.direccion = 1;
        }

        this.setVelocityX(this.velocidadPatrulla * this.direccion);
        this.setFlipX(this.direccion < 0); // Mirar a donde camina
        this.anims.play('walk', true); // Animación caminar
    }

    estadoPerseguir(jugador) {
        // Correr hacia el jugador
        if (jugador.x < this.x) {
            this.setVelocityX(-this.velocidadPersecucion);
            this.setFlipX(true); // Mirar izq
        } else {
            this.setVelocityX(this.velocidadPersecucion);
            this.setFlipX(false); // Mirar der
        }
        this.anims.play('run', true); // Animación correr
    }

    estadoAtacar(jugador) {
        // Frenar para disparar
        this.setVelocityX(0);
        
        // Mirar al jugador
        this.setFlipX(jugador.x < this.x);

        // Disparar si ya pasó el tiempo (Cooldown)
        const tiempoActual = this.scene.time.now;
        if (tiempoActual > this.nextShot) {
            
            this.disparar(jugador);
            this.nextShot = tiempoActual + this.fireRate;
            
            // Animación de disparo (si la tienes) o idle
            this.anims.play('shoot', true); 
        } else {
            // Mientras recarga, se queda quieto o en idle
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== 'shoot') {
                this.anims.play('idle', true);
            }
        }
    }

    disparar(jugador) {
        if (!this.bulletsGroup) return;

        // Obtener bala del grupo de la escena
        const bala = this.bulletsGroup.get(this.x, this.y - 20); // -20 para que salga del pecho/arma

        if (bala) {
            // Calcular ángulo hacia el jugador
            const angulo = Phaser.Math.Angle.Between(this.x, this.y - 20, jugador.x, jugador.y - 20);
            
            // Si la bala tiene método fire (tu clase Bala.js mejorada), úsalo
            if (bala.fire) {
                bala.fire(this.x, this.y - 20, angulo);
                
                // OPCIONAL: Cambiar color de bala enemiga
                bala.setTint(0xff0000); 
                // Hacerla más lenta que la del jugador para que sea esquivable
                this.scene.physics.velocityFromRotation(angulo, 300, bala.body.velocity); 
            }
        }
    }

    recibirDaño() {
        if (this.isDead) return;
        this.vida--;
        this.setTint(0xffffff); // Flash blanco
        this.scene.time.delayedCall(100, () => {
             if(!this.isDead) this.setTint(0xff5555);
        });

        if (this.vida <= 0) this.morir();
    }

    morir() {
        this.isDead = true;
        this.setVelocity(0,0);
        this.body.enable = false;
        this.setTint(0xffffff);
        this.anims.play('dead', true);
        
        // Loot (30% chance)
        if (Phaser.Math.Between(1, 100) <= 30) {
            this.scene.spawnPickup(this.x, this.y);
        }

        this.on('animationcomplete-dead', () => {
            this.destroy();
        });
    }
}