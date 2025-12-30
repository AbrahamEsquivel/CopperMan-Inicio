import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');
        
        // bala
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(0, 0, 10, 4);
        graphics.generateTexture('bala', 10, 4);
    }

    create() {

        this.physics.world.setBounds(0, 0, 2000, 600);
        // Cámara dentro de los límites del mundo
        this.cameras.main.setBounds(0, 0, 2000, 600);

        // config
        this.velocidadBala = 900;
        this.velocidadCaminar = 100;
        this.velocidadCorrer = 250;
        
        this.maxStamina = 100;
        this.stamina = 100;
        this.costoSalto = 20;
        this.costoCorrer = 0.5;

        this.municionMax = 30;
        this.municionActual = 30;
        this.isReloading = false;

        // --- SISTEMA DE VIDA ---
        this.vidaMax = 3;
        this.vidaActual = 3;
        this.esInvulnerable = false;

        // controles
        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            recargar: Phaser.Input.Keyboard.KeyCodes.R
        });

        // disparo clic
        this.input.on('pointerdown', (pointer) => {
            if (this.isShooting) return;
            this.disparar(pointer);
        });

        // UI
        // barra stamina
        this.barrasUI = this.add.graphics();
        this.barrasUI.setScrollFactor(0);

        // texto munición
        this.textoMunicion = this.add.text(12, 40, 'BALAS: 30 / 30', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.textoMunicion.setScrollFactor(0);

        this.textoVida = this.add.text(12, 70, 'VIDA: 3', { // Debajo de las balas
            fontSize: '20px',
            fill: '#ff0000',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.textoVida.setScrollFactor(0);

        // entorno
        const frameNames = this.textures.get('soldado').getFrameNames();
        console.log('Frames:', frameNames);

        // fondo
        if (this.textures.exists('sky')) {
            this.add.image(400, 300, 'sky');
        } else {
            this.cameras.main.setBackgroundColor('#444444');
        }

        // Plataformas
        this.plataformas = this.physics.add.staticGroup();
        if (this.textures.exists('suelo')) {
            this.plataformas.create(400, 568, 'suelo').setScale(2).refreshBody();
            this.plataformas.create(600, 400, 'suelo');
        } else {
            const piso = this.add.rectangle(400, 580, 800, 40, 0x00ff00);
            this.physics.add.existing(piso, true);
            this.plataformas.add(piso);
        }

        // jugador
        this.jugador = this.physics.add.sprite(100, 450, 'soldado', 'inactivo1');
        this.jugador.setOrigin(0.5, 1); 
        this.jugador.setScale(1);
        this.jugador.setBounce(0.1);
        this.jugador.setCollideWorldBounds(true);
        this.jugador.body.setSize(40, 60); 
        this.jugador.body.setOffset(44, 68);

        // La cámara sigue al jugador (ahora que existe)
        this.cameras.main.startFollow(this.jugador);

        // enemigos (grupo)
        this.enemigos = this.physics.add.group();

        this.physics.add.collider(this.jugador, this.plataformas);
        this.physics.add.collider(this.enemigos, this.plataformas);

        // balas (grupo)
        this.balas = this.physics.add.group({
            defaultKey: 'bala',
            maxSize: 10
        });



        // enemigos
        // crea enemigo en (x,y)
        this.crearEnemigo = (x, y) => {
            // Usamos el mismo sprite 'soldado'
            const enemigo = this.enemigos.create(x, y, 'soldado', 'inactivo1');
            
            // ajustes físicos
            enemigo.setOrigin(0.5, 1);
            enemigo.body.setSize(40, 60);
            enemigo.body.setOffset(44, 68);
            enemigo.setCollideWorldBounds(true);
            enemigo.setBounce(0.1);

            // tinte
            enemigo.setTint(0xff5555); 
            
            // vida
            enemigo.vida = 3; 
        };

        // spawn
        this.crearEnemigo(600, 450); // A la derecha del mapa

        // animaciones

        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'caminar', start: 1, end: 8, zeroPad: 0, suffix: '' 
            }),
            frameRate: 10, repeat: -1
        });

        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'correr', start: 1, end: 8, zeroPad: 0, suffix: '' 
            }),
            frameRate: 14, repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'inactivo', start: 1, end: 9, zeroPad: 0, suffix: ''
            }),
            frameRate: 8, repeat: -1
        });

        this.anims.create({
            key: 'shoot',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'disparar', start: 1, end: 4, zeroPad: 0, suffix: ''
            }),
            frameRate: 20, repeat: 0
        });

        this.anims.create({
            key: 'reload',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'recargar', start: 1, end: 7, zeroPad: 0, suffix: '' 
            }),
            frameRate: 10, repeat: 0
        });

        // muerte
        this.anims.create({
            key: 'dead',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'muerte', start: 1, end: 4, zeroPad: 0, suffix: ''
            }),
            frameRate: 10,
            repeat: 0 
        });

        // eventos anim
        this.jugador.on('animationcomplete-shoot', () => {
            this.isShooting = false;
        });

        this.jugador.on('animationcomplete-reload', () => {
            this.municionActual = this.municionMax;
            this.isReloading = false;
            this.actualizarTextoMunicion();
        });

        this.physics.add.collider(this.jugador, this.enemigos, (jugador, enemigo) => {
            this.recibirDaño(jugador, enemigo);
        });

        // colisión balas/enemigos
        this.physics.add.overlap(this.balas, this.enemigos, (bala, enemigo) => {
            bala.destroy();
            if (enemigo.body.enable) {
                enemigo.body.enable = false;
                enemigo.setTint(0xffffff);
                enemigo.anims.play('dead', true);
                enemigo.on('animationcomplete-dead', () => enemigo.destroy());
            }
        });
    }

    update() {
        if (!this.jugador) return;

        // --- 1. LÓGICA DE RECARGA ---
        if (Phaser.Input.Keyboard.JustDown(this.teclas.recargar)) {
            this.iniciarRecarga();
        }

        // --- 2. STAMINA ---
        // Regenerar stamina si no está corriendo (solo si tenemos control)
        const estaCorriendoInput = this.teclas.shift.isDown && (this.teclas.left.isDown || this.teclas.right.isDown);
        if (!estaCorriendoInput && this.stamina < this.maxStamina) {
            this.stamina += 0.3; 
        }

        // --- 3. MOVIMIENTO Y FÍSICAS ---
        
        // BLOQUEO POR DAÑO: Si somos invulnerables (nos acaban de pegar),
        // perdemos el control para que la física del empujón (knockback) actúe.
        if (this.esInvulnerable) {
            // No hacemos nada con la velocidad X, dejamos que el empujón nos mueva.
        } 
        else {
            // --- CONTROL NORMAL DEL JUGADOR ---
            let velocidadActual = this.velocidadCaminar;

            // Lógica de Correr
            if (this.teclas.shift.isDown && this.stamina > 0) {
                velocidadActual = this.velocidadCorrer;
                
                // Consumir stamina si se mueve
                if (this.teclas.left.isDown || this.teclas.right.isDown) {
                    this.stamina -= this.costoCorrer;
                }
            }

            // Movimiento Horizontal
            if (this.teclas.left.isDown) {
                this.jugador.setVelocityX(-velocidadActual);
                this.jugador.setFlipX(true);
            } else if (this.teclas.right.isDown) {
                this.jugador.setVelocityX(velocidadActual);
                this.jugador.setFlipX(false);
            } else {
                this.jugador.setVelocityX(0);
            }

            // Salto
            if ((this.teclas.up.isDown || this.teclas.space.isDown) && 
                this.jugador.body.touching.down && 
                this.stamina >= this.costoSalto) {
                
                this.jugador.setVelocityY(-330);
                this.stamina -= this.costoSalto; 
            }
        }

        // Actualizar UI
        this.actualizarInterfaz();

        // --- 4. CONTROL DE ANIMACIONES ---
        
        // PRIORIDAD 1: MUERTE (Si la vida es 0, no animar nada más)
        if (this.vidaActual <= 0) {
             // La animación 'dead' se activa en la función recibirDaño, aquí no interrumpimos
        }
        // PRIORIDAD 2: RECARGANDO
        else if (this.isReloading) {
            // Esperar
        }
        // PRIORIDAD 3: DISPARANDO
        else if (this.isShooting) {
            // Esperar
        }
        // PRIORIDAD 4: MOVIMIENTO (Suelo)
        else if (this.jugador.body.velocity.x !== 0) {
            // Detectar automáticamente si corre o camina según la velocidad real
            // (Usamos 110 como margen porque caminar es 100)
            const anim = Math.abs(this.jugador.body.velocity.x) > 110 ? 'run' : 'walk';
            this.jugador.anims.play(anim, true);
        }
        // PRIORIDAD 5: QUIETO
        else {
            this.jugador.anims.play('idle', true);
        }

        // --- 5. INTELIGENCIA ARTIFICIAL (ENEMIGOS) ---
        this.enemigos.children.iterate((enemigo) => {
            if (!enemigo || !enemigo.body || !enemigo.body.enable) return;

            const distancia = Phaser.Math.Distance.Between(enemigo.x, enemigo.y, this.jugador.x, this.jugador.y);

            // Perseguir si está cerca (menos de 400px) y el jugador está vivo
            if (distancia < 400 && this.vidaActual > 0) {
                if (enemigo.x > this.jugador.x) {
                    enemigo.setVelocityX(-80);
                    enemigo.setFlipX(true);
                } else {
                    enemigo.setVelocityX(80);
                    enemigo.setFlipX(false);
                }
                enemigo.anims.play('walk', true);
            } else {
                enemigo.setVelocityX(0);
                enemigo.anims.play('idle', true);
            }
        });
    }

    disparar(pointer) {
        // 1. BLOQUEOS: Si recarga, si no tiene balas, o si ya está disparando
        if (this.isReloading || this.isShooting) return;

        if (this.municionActual <= 0) {
            console.log("¡Click! Sin balas"); // Aquí luego pondremos sonido de "vacío"
            // Opcional: Forzar recarga automática si disparas sin balas
            this.iniciarRecarga();
            return;
        }

        // --- LÓGICA DE DISPARO NORMAL ---
        
        // Orientación del personaje
        if (pointer.worldX < this.jugador.x) {
            this.jugador.setFlipX(true);
        } else {
            this.jugador.setFlipX(false);
        }
        
        this.isShooting = true;
        this.municionActual--; // Restamos una bala
        this.actualizarTextoMunicion(); // Actualizamos el UI
        
        this.jugador.anims.play('shoot', true);

        const bala = this.balas.get(this.jugador.x, this.jugador.y);

        if (bala) {
            bala.setActive(true);
            bala.setVisible(true);
            
            // Ajuste de posición (recuerda que cambiamos el origin a los pies)
            const offset = this.jugador.flipX ? -30 : 30;
            bala.setPosition(this.jugador.x + offset, this.jugador.y - 45);

            const angulo = Phaser.Math.Angle.Between(
                this.jugador.x, this.jugador.y, 
                pointer.worldX, pointer.worldY
            );

            bala.setRotation(angulo);
            this.physics.velocityFromRotation(angulo, this.velocidadBala, bala.body.velocity);
            
            this.time.delayedCall(2000, () => {
                bala.setActive(false);
                bala.setVisible(false);
            });
        }
    }

    iniciarRecarga() {
        // Solo recargar si no estoy lleno y no estoy recargando ya
        if (!this.isReloading && this.municionActual < this.municionMax) {
            this.isReloading = true;
            this.jugador.anims.play('reload', true);
        }
    }

    recibirDaño(jugador, enemigo) {
        // 1. Si ya soy invulnerable o estoy muerto, ignorar
        if (this.esInvulnerable || this.vidaActual <= 0) return;

        // 2. Restar vida
        this.vidaActual--;
        this.textoVida.setText(`VIDA: ${this.vidaActual}`);

        // 3. GAME OVER
        if (this.vidaActual <= 0) {
            // Animación de muerte
            this.physics.pause(); // Congelar todo
            this.jugador.setTint(0xff0000);
            this.jugador.anims.play('dead', true); // Asegúrate de tener la anim 'dead' creada
            
            // Reiniciar juego después de 2 segundos
            this.time.delayedCall(2000, () => {
                this.scene.restart();
            });
            return;
        }

        // 4. DAÑO NO LETAL (Knockback + Invulnerabilidad)
        this.esInvulnerable = true;
        
        // Empujón hacia atrás (Knockback)
        // Si el enemigo está a la derecha, me empuja a la izquierda
        const direccionEmpuje = enemigo.x < jugador.x ? 1 : -1;
        this.jugador.setVelocityX(200 * direccionEmpuje);
        this.jugador.setVelocityY(-200); // Un saltito
        
        // Feedback visual (Parpadeo rojo)
        this.jugador.setTint(0xff0000);
        
        // Resetear invulnerabilidad después de 1 segundo
        this.time.delayedCall(1000, () => {
            this.esInvulnerable = false;
            this.jugador.clearTint(); // Volver al color normal
        });
    }

    actualizarTextoMunicion() {
        this.textoMunicion.setText(`BALAS: ${this.municionActual} / ${this.municionMax}`);
        
        // Color rojo si quedan pocas
        if (this.municionActual === 0) this.textoMunicion.setColor('#ff0000');
        else this.textoMunicion.setColor('#ffffff');
    }

    actualizarInterfaz() {
        this.barrasUI.clear();

        // Fondo de la barra de stamina
        this.barrasUI.fillStyle(0x000000);
        this.barrasUI.fillRect(10, 10, 200, 20);

        // Barra de stamina
        const porcentaje = Math.max(0, this.stamina / this.maxStamina);
        const color = porcentaje > 0.3 ? 0x00ff00 : 0xff0000;
        
        this.barrasUI.fillStyle(color);
        this.barrasUI.fillRect(12, 12, 196 * porcentaje, 16);
    }
}