import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.atlas('soldado', 'assets/soldado.png', 'assets/soldado.json');
        
        // Textura de la bala
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0xffff00, 1);
        graphics.fillRect(0, 0, 10, 4);
        graphics.generateTexture('bala', 10, 4);
    }

    create() {
        // Configuración inicial
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

        // Controles
        this.teclas = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            recargar: Phaser.Input.Keyboard.KeyCodes.R
        });

        // Disparo por clic
        this.input.on('pointerdown', (pointer) => {
            if (this.isShooting) return;
            this.disparar(pointer);
        });

        // UI
        // Barra de stamina
        this.barrasUI = this.add.graphics();
        this.barrasUI.setScrollFactor(0);

        // Texto de Munición
        this.textoMunicion = this.add.text(12, 40, 'BALAS: 30 / 30', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        this.textoMunicion.setScrollFactor(0);

        // Entorno y físicas
        const frameNames = this.textures.get('soldado').getFrameNames();
        console.log('Frames:', frameNames);

        // Fondo
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

        // Jugador
        this.jugador = this.physics.add.sprite(100, 450, 'soldado', 'inactivo1');
        this.jugador.setOrigin(0.5, 1); 
        this.jugador.setScale(1);
        this.jugador.setBounce(0.1);
        this.jugador.setCollideWorldBounds(true);
        this.jugador.body.setSize(40, 60); 
        this.jugador.body.setOffset(44, 68);

        // Grupo de enemigos (necesario antes de crear colliders)
        this.enemigos = this.physics.add.group();

        this.physics.add.collider(this.jugador, this.plataformas);
        this.physics.add.collider(this.enemigos, this.plataformas);

        // Grupo de balas
        this.balas = this.physics.add.group({
            defaultKey: 'bala',
            maxSize: 10
        });



        // Enemigos
        // Crea un enemigo en (x, y)
        this.crearEnemigo = (x, y) => {
            // Usamos el mismo sprite 'soldado'
            const enemigo = this.enemigos.create(x, y, 'soldado', 'inactivo1');
            
            // Ajustes físicos
            enemigo.setOrigin(0.5, 1);
            enemigo.body.setSize(40, 60);
            enemigo.body.setOffset(44, 68);
            enemigo.setCollideWorldBounds(true);
            enemigo.setBounce(0.1);

            // Marcador visual
            enemigo.setTint(0xff5555); 
            
            // Vida (opcional)
            enemigo.vida = 3; 
        };

        // Spawn inicial
        this.crearEnemigo(600, 450); // A la derecha del mapa

        // Animaciones

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

        // Animación de muerte
        this.anims.create({
            key: 'dead',
            frames: this.anims.generateFrameNames('soldado', { 
                prefix: 'muerte', start: 1, end: 4, zeroPad: 0, suffix: ''
            }),
            frameRate: 10,
            repeat: 0 
        });

        // Eventos de animación
        this.jugador.on('animationcomplete-shoot', () => {
            this.isShooting = false;
        });

        this.jugador.on('animationcomplete-reload', () => {
            this.municionActual = this.municionMax;
            this.isReloading = false;
            this.actualizarTextoMunicion();
        });

        // Colisión balas vs enemigos
        this.physics.add.overlap(this.balas, this.enemigos, (bala, enemigo) => {
            // Eliminar bala
            bala.destroy(); // O bala.disableBody(true, true) si quieres reciclarla

            // Muerte instantánea
            if (enemigo.body.enable) {
                enemigo.body.enable = false;
                enemigo.setTint(0xffffff);
                enemigo.anims.play('dead', true);
                enemigo.on('animationcomplete-dead', () => {
                    enemigo.destroy();
                });
            }
        });
    }

    update() {
        if (!this.jugador) return;

        // --- 1. LÓGICA DE RECARGA (INPUT) ---
        // Detectar si se presiona la tecla R una sola vez
        if (Phaser.Input.Keyboard.JustDown(this.teclas.recargar)) {
            this.iniciarRecarga();
        }

        // --- 2. STAMINA ---
        // Regenerar stamina si no está corriendo
        const estaCorriendo = this.teclas.shift.isDown && (this.teclas.left.isDown || this.teclas.right.isDown);
        
        if (!estaCorriendo && this.stamina < this.maxStamina) {
            this.stamina += 0.3; 
        }

        // --- 3. MOVIMIENTO ---
        let velocidadActual = this.velocidadCaminar;
        let animacionMovimiento = 'walk';

        // Cambiar a correr si se presiona Shift y hay suficiente stamina
        if (this.teclas.shift.isDown && this.stamina > 0) {
            velocidadActual = this.velocidadCorrer;
            animacionMovimiento = 'run';
            
            // Consumir stamina si se mueve
            if (this.teclas.left.isDown || this.teclas.right.isDown) {
                this.stamina -= this.costoCorrer;
            }
        }

        if (this.teclas.left.isDown) {
            this.jugador.setVelocityX(-velocidadActual);
            this.jugador.setFlipX(true);
        } else if (this.teclas.right.isDown) {
            this.jugador.setVelocityX(velocidadActual);
            this.jugador.setFlipX(false);
        } else {
            this.jugador.setVelocityX(0);
        }

        // --- 4. SALTO ---
        if ((this.teclas.up.isDown || this.teclas.space.isDown) && 
            this.jugador.body.touching.down && 
            this.stamina >= this.costoSalto) {
            
            this.jugador.setVelocityY(-330);
            this.stamina -= this.costoSalto; 
        }

        // Actualizar la barra de stamina
        this.actualizarInterfaz();

        // --- 5. CONTROL DE ANIMACIONES (PRIORIDADES) ---
        
        // PRIORIDAD 1: RECARGANDO (Bloquea todo lo demás)
        if (this.isReloading) {
            // No hacemos nada, dejamos que la animación 'reload' termine sola
        }
        // PRIORIDAD 2: DISPARANDO
        else if (this.isShooting) {
            // Esperamos a que termine el disparo
        }
        // PRIORIDAD 3: MOVIMIENTO (Suelo)
        else if (this.jugador.body.velocity.x !== 0) {
            this.jugador.anims.play(animacionMovimiento, true);
        }
        // PRIORIDAD 4: QUIETO
        else {
            this.jugador.anims.play('idle', true);
        }
        
        // Nota: He quitado la animación de Salto intencionalmente 
        // porque borraste las imágenes defectuosas.
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