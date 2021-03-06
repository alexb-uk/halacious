/* eslint-disable no-shadow */
/* eslint-env node, mocha */
let chai = require('chai');

let should = chai.should();
const { plugin } = require('../lib/plugin');
let hapi = require('hapi');
let sinon = require('sinon');
let sinonChai = require('sinon-chai');
let chaiString = require('chai-string');
let halacious = require('../');
let vision = require('vision');
let _ = require('lodash');
let url = require('url');

chai.use(sinonChai);
chai.use(chaiString);

describe('Halacious Plugin', () => {
  let server;
  beforeEach(done => {
    server = new hapi.Server({ port: 9090 });
    done();
  });

  afterEach(done => {
    server.stop().then(() => {
      done();
    });
  });

  it('should have a registration function', () => {
    plugin.should.have.property('register');
    plugin.register.should.be.a('Function');
  });

  it('should expose a namespace function', done => {
    server.register(halacious).then(() => {
      server.plugins.halacious.should.have.property('namespaces');
      server.plugins.halacious.namespace.should.be.a('Function');
      done();
    });
  });

  it('should create a namespace', done => {
    server.register(halacious).then(() => {
      let ns = server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      should.exist(ns);
      ns.should.have.property('name', 'mycompany');
      ns.should.have.property('prefix', 'mco');
      ns.should.have.property('rel');
      ns.rel.should.be.a('Function');
      done();
    });
  });

  it('should look up a namespace', done => {
    server.register(halacious).then(() => {
      server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      let ns = server.plugins.halacious.namespace('mycompany');
      ns.rel({ name: 'boss', description: 'An employees boss' });
      ns.rels.should.have.property('boss');
      ns.rels.boss.should.have.property('name', 'boss');
      ns.rels.boss.should.have.property('description', 'An employees boss');
      done();
    });
  });

  it('should return a sorted array of namespaces', () => {
    server.register(halacious).then(() => {
      let namespaces;
      server.plugins.halacious.namespaces.add({
        name: 'yourcompany',
        prefix: 'yco',
      });
      server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      server.plugins.halacious.namespaces.add({
        name: 'ourcompany',
        prefix: 'oco',
      });

      namespaces = server.plugins.halacious.namespaces();
      namespaces.should.have.length(3);
      namespaces[0].should.have.property('name', 'mycompany');
      namespaces[1].should.have.property('name', 'ourcompany');
      namespaces[2].should.have.property('name', 'yourcompany');
    });
  });

  it('should fail when registering an invalid namespace', () => {
    server.register(halacious).then(() => {
      const plugin = server.plugins.halacious;
      plugin.namespaces.add
        .bind(plugin.namespaces, {
          name: 'mycompany',
          prefirx: 'mco',
        })
        .should.throw('"prefirx" is not allowed');
    });
  });

  it('should add a rel to a namespace', done => {
    server.register(halacious).then(() => {
      let ns = server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      ns.rel({ name: 'boss', description: 'An employees boss' });
      ns.rels.should.have.property('boss');
      ns.rels.boss.should.have.property('name', 'boss');
      ns.rels.boss.should.have.property('description', 'An employees boss');
      done();
    });
  });

  it('should look up a rel by prefix:name', done => {
    server.register(halacious).then(() => {
      let ns = server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      ns.rel({ name: 'datasources', description: 'A list of datasources' });
      let rel = server.plugins.halacious.rel('mco:datasources');
      should.exist(rel);
      rel.should.have.property('name', 'datasources');
      rel.should.have.property('description', 'A list of datasources');
      done();
    });
  });

  it('should remove a namespace', () => {
    server.register(halacious).then(() => {
      server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      server.plugins.halacious.namespaces.add({
        name: 'yourcompany',
        prefix: 'yco',
      });
      server.plugins.halacious.namespaces().should.have.length(2);
      server.plugins.halacious.namespaces.remove('yourcompany');
      server.plugins.halacious.namespaces().should.have.length(1);
      server.plugins.halacious
        .namespaces()[0]
        .should.have.property('name', 'mycompany');
    });
  });

  it('should look up a rel by ns / name', done => {
    server.register(halacious).then(() => {
      let ns = server.plugins.halacious.namespaces.add({
        name: 'mycompany',
        prefix: 'mco',
      });
      ns.rel({ name: 'datasources', description: 'A list of datasources' });
      let rel = server.plugins.halacious.rel('mycompany', 'datasources');
      should.exist(rel);
      rel.should.have.property('name', 'datasources');
      rel.should.have.property('description', 'A list of datasources');
      done();
    });
  });

  it('should add a rel to a specified namespace', done => {
    server.register(halacious).then(() => {
      let rels;
      const plugin = server.plugins.halacious;
      plugin.namespaces.add({ name: 'thiscompany', prefix: 'tco' });
      plugin.rels.add('thiscompany', 'a_rel');
      plugin.rels.add('thiscompany', { name: 'b_rel' });
      rels = _.values(plugin.namespace('thiscompany').rels);
      rels.should.have.length(2);
      _.map(rels, 'name').should.deep.equal(['a_rel', 'b_rel']);
      done();
    });
  });

  it('should return a sorted list of rels', done => {
    server.register(halacious).then(() => {
      let rels;
      const plugin = server.plugins.halacious;
      plugin.namespaces
        .add({ name: 'mycompany', prefix: 'mco' })
        .rel('a_rel')
        .rel('c_rel');
      plugin.namespaces
        .add({ name: 'yourcompany', prefix: 'yco' })
        .rel('b_rel')
        .rel('d_rel');
      rels = plugin.rels();
      rels.should.have.length(4);
      _.map(rels, 'name').should.deep.equal([
        'a_rel',
        'b_rel',
        'c_rel',
        'd_rel',
      ]);
      done();
    });
  });

  it('should bomb on a bad rel in strict mode', done => {
    server.route({
      method: 'get',
      path: '/foo',
      config: {
        handler() {
          return { name: 'Billy Bob' };
        },
        plugins: {
          hal: {
            links: {
              'mco:badRel': './badRel',
            },
          },
        },
      },
    });

    server
      .register({ plugin: halacious, options: { strict: true } })
      .then(() => {
        server.plugins.halacious.namespaces.add({
          dir: `${__dirname}/rels/mycompany`,
          prefix: 'mco',
        });
        server
          .inject({
            method: 'get',
            url: '/foo',
            headers: { Accept: 'application/hal+json' },
          })
          .then(res => {
            res.statusCode.should.equal(500);
            done();
          });
      })
      .catch(err => {
        done(err);
      });
  });

  it('should install a directory-style namespace', done => {
    server.register(halacious).then(() => {
      let ns = server.plugins.halacious.namespaces.add({
        dir: `${__dirname}/rels/mycompany`,
        prefix: 'mco',
      });
      let rel1 = server.plugins.halacious.rel('mco:datasources');
      let rel2 = server.plugins.halacious.rel('mco:datasource');
      should.exist(ns);
      should.exist(rel1);
      should.exist(rel2);
      rel1.should.have.property('name', 'datasources');
      rel2.should.have.property('name', 'datasource');
      done();
    });
  });

  it('should route rel documentation', async () => {
    await server.register(vision);

    await server.register(halacious).then(() => {
      server.plugins.halacious.namespaces.add({
        dir: `${__dirname}/rels/mycompany`,
        prefix: 'mco',
      });
    });

    return server
      .start()
      .then(() =>
        server.inject({
          method: 'get',
          url: '/rels/mycompany/boss',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.payload.should.not.be.empty;
      });
  });

  it('should resolve a named route path', done => {
    server.route({
      method: 'get',
      path: '/{a}/{b}/{c}',
      config: {
        handler(req) {
          return { a: req.params.a, b: req.params.b, c: req.params.c };
        },
        plugins: {
          hal: {
            name: 'test-route',
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        const path = server.plugins.halacious.route('test-route', {
          a: 'i',
          b: 'aint',
          c: 'fack',
        });
        path.should.equal('/i/aint/fack');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should encode parameter values when resolving a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{foo}/{bar}',
      config: {
        handler(req) {
          return { foo: req.params.foo, bar: req.params.bar };
        },
        plugins: {
          hal: {
            name: 'deez-treez',
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        let path = server.plugins.halacious.route('deez-treez', {
          foo: 'are/fire',
          bar: 'proof',
        });
        path.should.not.equal('/deez/treez/are/fire/proof');
        path.should.equal('/deez/treez/are%2Ffire/proof');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should passively ignore child objects in parameter hash when resolving a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{foo}/{bar}',
      config: {
        handler(req) {
          return { foo: req.params.foo, bar: req.params.bar };
        },
        plugins: {
          hal: {
            name: 'deez-treez',
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.route.bind(halacious, 'deez-treez', {
          foo: 'are',
          bar: 'fire/proof',
          things: { should: 'not break' },
        }).should.not.throw;

        let path = server.plugins.halacious.route('deez-treez', {
          foo: 'are',
          bar: 'fire/proof',
          things: { should: 'not break' },
        });
        path.should.not.equal('/deez/treez/are/fire/proof');
        path.should.equal('/deez/treez/are/fire%2Fproof');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should handle presence of optional Hapi route parameters in a named route', done => {
    server.route({
      method: 'get',
      path: '/deez/treez/{are?}',
      config: {
        handler(req) {
          return { foo: req.params.foo };
        },
        plugins: {
          hal: {
            name: 'deez-treez',
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        let path = null;
        let fn = function() {
          path = server.plugins.halacious.route('deez-treez', {
            are: 'fireproof',
          });
        };
        fn.should.not.throw(Error);
        should.exist(path);
        path.should.equal('/deez/treez/fireproof');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should convert a json entity into a HAL representation with self and a simple link', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        },
        plugins: {
          hal: {
            links: {
              'mco:boss': './boss',
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: '/people/100/boss' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should convert a json entity into a HAL representation with self and a templated link', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
        },
        plugins: {
          hal: {
            links: {
              'mco:boss': { href: '../{bossId}', title: 'Boss' },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: '/people/1234', title: 'Boss' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should allow for programmatic population of a hal entity', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support a hal configuration function', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith', bossId: '1234' };
        },
        plugins: {
          hal(rep, done) {
            rep.link('mco:boss', 'http://www.whitehouse.gov');
            done();
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should embed an object property', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            boss: { firstName: 'Boss', lastName: 'Man' },
          };
        },
        plugins: {
          hal: {
            embedded: {
              'mco:boss': {
                path: 'boss',
                href: './boss',
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
          },
          firstName: 'Bob',
          lastName: 'Smith',
          _embedded: {
            'mco:boss': {
              _links: { self: { href: '/people/100/boss' } },
              firstName: 'Boss',
              lastName: 'Man',
            },
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support embedded url templates', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            id: 100,
            firstName: 'Bob',
            lastName: 'Smith',
            boss: { id: 200, firstName: 'Boss', lastName: 'Man' },
          };
        },
        plugins: {
          hal: {
            embedded: {
              'mco:boss': {
                path: 'boss',
                href: '/people/{self.id}/{item.id}',
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
          },
          id: 100,
          firstName: 'Bob',
          lastName: 'Smith',
          _embedded: {
            'mco:boss': {
              _links: { self: { href: '/people/100/200' } },
              id: 200,
              firstName: 'Boss',
              lastName: 'Man',
            },
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should provide embedded collection support', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        handler() {
          return {
            start: 0,
            count: 2,
            total: 2,
            items: [
              { id: 100, firstName: 'Bob', lastName: 'Smith' },
              { id: 200, firstName: 'Boss', lastName: 'Man' },
            ],
          };
        },
        plugins: {
          hal: {
            embedded: {
              'mco:person': {
                path: 'items',
                href: './{item.id}',
                links: {
                  'mco:boss': './boss',
                },
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
          },
          start: 0,
          count: 2,
          total: 2,
          _embedded: {
            'mco:person': [
              {
                _links: {
                  self: { href: '/people/100' },
                  'mco:boss': { href: '/people/100/boss' },
                },
                id: 100,
                firstName: 'Bob',
                lastName: 'Smith',
              },
              {
                _links: {
                  self: { href: '/people/200' },
                  'mco:boss': { href: '/people/200/boss' },
                },
                id: 200,
                firstName: 'Boss',
                lastName: 'Man',
              },
            ],
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should invoke an optional toHal() method on the source entity', done => {
    let result;
    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            toHal(rep, done) {
              rep.link('mco:boss', './boss');
              done();
            },
          };
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: '/people/100/boss' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it("should allow for programmatic population of a hal entity and it's configured embedded entities", done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: { id: '5678' },
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  setTimeout(() => {
                    rep.link('foo:bar', 'http://www.foo.com');
                    next();
                  }, 500);
                },
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
          _embedded: {
            foo: {
              _links: {
                self: { href: '/foo/5678' },
                'foo:bar': { href: 'http://www.foo.com' },
              },
              id: '5678',
            },
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should omit missing configured embedded entities', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: { id: '5678' },
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  rep.link('foo:bar', 'http://www.foo.com');
                  next();
                },
              },
              bar: {
                path: 'notthere',
                href: '/bar/{item.id}',
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
          _embedded: {
            foo: {
              _links: {
                self: { href: '/foo/5678' },
                'foo:bar': { href: 'http://www.foo.com' },
              },
              id: '5678',
            },
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should allow an embedded entity to be forced to be a single element array', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return {
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
            foo: [{ id: '5678' }],
          };
        },
        plugins: {
          hal: {
            prepare(rep, done) {
              rep.link('mco:boss', 'http://www.whitehouse.gov');
              done();
            },
            embedded: {
              foo: {
                path: 'foo',
                href: '/foo/{item.id}',
                prepare(rep, next) {
                  rep.link('foo:bar', 'http://www.foo.com');
                  next();
                },
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() => {
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'boss' });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            'mco:boss': { href: 'http://www.whitehouse.gov' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
          _embedded: {
            foo: [
              {
                _links: {
                  self: { href: '/foo/5678' },
                  'foo:bar': { href: 'http://www.foo.com' },
                },
                id: '5678',
              },
            ],
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should preserve 201 status code and use the location header when an entity has been POSTed', done => {
    let result;

    server.route({
      method: 'post',
      path: '/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Bob', lastName: 'Smith' })
            .created('/people/100');
        },
      },
    });

    server
      .register(halacious)
      .then(() =>
        server.inject({
          method: 'post',
          url: '/people',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
          },
          id: 100,
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('use of location header for absolute link generation should not break url search', done => {
    let result;

    server.route({
      method: 'post',
      path: '/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Bob', lastName: 'Smith' })
            .created('/people/100?donotbreakthis=true');
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: {
          absolute: true,
        },
      })
      .then(() =>
        server.inject({
          method: 'post',
          url: '/people',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);
        result = JSON.parse(res.payload);
        result.should.have.a
          .property('_links')
          .that.has.a.property('self')
          .that.has.a.property('href')
          .that.endsWith('/people/100?donotbreakthis=true');
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support an array of acceptable media types', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/hal+json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should regurgitate known query parameters in the self link', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        handler() {
          return { items: [{ id: 100, firstName: 'Louis', lastName: 'CK' }] };
        },
        plugins: {
          hal: {
            embedded: {
              items: {
                path: 'items',
                href: './{item.id}',
              },
            },
            query: '{?q*,start,limit}',
          },
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people?q=funny&start=1&token=12345',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people?q=funny&start=1' },
          },
          _embedded: {
            items: [
              {
                _links: { self: { href: '/people/100' } },
                id: 100,
                firstName: 'Louis',
                lastName: 'CK',
              },
            ],
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should resolve relative locations', done => {
    let result;

    server.route({
      method: 'post',
      path: '/api/people',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Louis', lastName: 'CK' })
            .created('api/people/100');
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] },
      })
      .then(() =>
        server.inject({
          method: 'post',
          url: '/api/people',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(201);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/api/people/100' },
          },
          id: 100,
          firstName: 'Louis',
          lastName: 'CK',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should preserve response headers', done => {
    server.route({
      method: 'get',
      path: '/api/people/100',
      config: {
        handler(req, h) {
          return h
            .response({ id: 100, firstName: 'Louis', lastName: 'CK' })
            .header('Last-Modified', new Date());
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { mediaTypes: ['application/json', 'application/hal+json'] },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/api/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.equal('application/hal+json');
        should.exist(res.headers['last-modified']);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  describe('when the absolute flag is turned on', () => {
    it('should create an absolute self link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return { id: 100, firstName: 'Louis', lastName: 'CK' };
          },
          plugins: {
            hal: {
              absolute: true,
            },
          },
        },
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] },
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' },
          })
        )
        .then(res => {
          let result = JSON.parse(res.payload);
          result._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100'
          );
          done();
        })
        .catch(err => {
          done(err);
        });
    });

    it('should create an absolute non-self link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return { id: 100, firstName: 'Louis', lastName: 'CK' };
          },
          plugins: {
            hal: {
              absolute: true,
              links: {
                schedule: './schedule',
              },
            },
          },
        },
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] },
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' },
          })
        )
        .then(res => {
          let result = JSON.parse(res.payload);
          result._links.schedule.should.have.property(
            'href',
            'http://localhost:9090/api/people/100/schedule'
          );
          done();
        })
        .catch(err => {
          done(err);
        });
    });

    it('should embed an object with an absolute link', done => {
      server.route({
        method: 'get',
        path: '/api/people/100',
        config: {
          handler() {
            return {
              firstName: 'Bob',
              lastName: 'Smith',
              boss: { firstName: 'Boss', lastName: 'Man' },
            };
          },
          plugins: {
            hal: {
              absolute: true,
              embedded: {
                'mco:boss': {
                  path: 'boss',
                  href: './boss',
                },
              },
            },
          },
        },
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] },
        })
        .then(() =>
          server.inject({
            method: 'get',
            url: 'http://localhost:9090/api/people/100',
            headers: { Accept: 'application/hal+json' },
          })
        )
        .then(res => {
          let result = JSON.parse(res.payload);
          result._embedded['mco:boss']._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100/boss'
          );
          done();
        })
        .catch(err => {
          done(err);
        });
    });

    it('should handle created entities', done => {
      server.route({
        method: 'post',
        path: '/api/people',
        config: {
          handler(req, h) {
            return h
              .response({ firstName: 'Bob', lastName: 'Smith' })
              .created('/api/people/100');
          },
          plugins: {
            hal: {
              absolute: true,
            },
          },
        },
      });

      server
        .register({
          plugin: halacious,
          options: { mediaTypes: ['application/json', 'application/hal+json'] },
        })
        .then(() =>
          server.inject({
            method: 'post',
            url: 'http://localhost:9090/api/people',
            headers: { Accept: 'application/hal+json' },
          })
        )
        .then(res => {
          let result = JSON.parse(res.payload);
          result._links.self.should.have.property(
            'href',
            'http://localhost:9090/api/people/100'
          );
          done();
        })
        .catch(err => {
          done(err);
        });
    });

    it('should make configured links absolute', done => {
      server.route({
        method: 'post',
        path: '/api/people',
        config: {
          handler() {
            return { firstName: 'Bob', lastName: 'Smith' };
          },
          plugins: {
            hal: {
              absolute: true,
              prepare(rep, done) {
                rep.link('mco:boss', '/api/people/101');
                done();
              },
            },
          },
        },
      });

      server
        .register({
          plugin: halacious,
          options: {
            mediaTypes: ['application/json', 'application/hal+json'],
            absolute: true,
          },
        })
        .then(() =>
          server.inject({
            method: 'post',
            url: 'http://localhost:9090/api/people',
            headers: { Accept: 'application/hal+json' },
          })
        )
        .then(res => {
          let result = JSON.parse(res.payload);
          result.should.have
            .property('_links')
            .that.has.property('mco:boss')
            .that.has.property('href', 'http://localhost:9090/api/people/101');
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });

  it('should support resolving embedded hrefs by ids', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        id: 'person',
        handler(req) {
          return {
            id: req.params.id,
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
          };
        },
        plugins: {
          hal: {
            query: '{?full}',
          },
        },
      },
    });

    server.route({
      method: 'get',
      path: '/people',
      handler() {
        return {
          items: [{ id: 100 }, { id: 200 }],
        };
      },
      config: {
        plugins: {
          hal: {
            embedded: {
              'mco:person': {
                path: 'items',
                href(rep, ctx) {
                  return rep.route('person', { id: ctx.item.id });
                },
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() =>
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' })
      )
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people' },
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
          },
          _embedded: {
            'mco:person': [
              {
                _links: {
                  self: { href: '/people/100{?full}' },
                },
                id: 100,
              },
              {
                _links: {
                  self: { href: '/people/200{?full}' },
                },
                id: 200,
              },
            ],
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support resolving link hrefs by ids', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        id: 'person',
        handler(req) {
          return {
            id: req.params.id,
            firstName: 'Bob',
            lastName: 'Smith',
            bossId: '1234',
          };
        },
        plugins: {
          hal: {
            query: '{?full}',
            links: {
              'mco:boss': function(rep, entity) {
                return rep.route('person', { id: entity.bossId });
              },
            },
          },
        },
      },
    });

    server
      .register(halacious)
      .then(() =>
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' })
      )
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            curies: [
              { name: 'mco', href: '/rels/mycompany/{rel}', templated: true },
            ],
            self: { href: '/people/100' },
            'mco:boss': { href: '/people/1234{?full}', templated: true },
          },
          id: '100',
          firstName: 'Bob',
          lastName: 'Smith',
          bossId: '1234',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support absolute api root hrefs', done => {
    server = new hapi.Server({
      debug: { request: ['*'], log: ['*'] },
      port: 9090,
    });
    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return [];
        },
        plugins: {
          hal: {
            api: 'mco:people',
            query: '{?full}',
          },
        },
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' })
      )
      .then(() =>
        server.inject({
          method: 'get',
          url: '/api/',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            curies: [
              {
                name: 'mco',
                href: `${server.info.uri}/rels/mycompany/{rel}`,
                templated: true,
              },
            ],
            self: { href: `${server.info.uri}/api/` },
            'mco:people': {
              href: `${server.info.uri}/people{?full}`,
              templated: true,
            },
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should embed an empty representation', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return { employees: [] };
        },
        plugins: {
          hal: {
            api: 'mco:person',
            embedded: {
              'mco:person': {
                path: 'employees',
                href: '../{item.id}',
              },
            },
          },
        },
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.plugins.halacious.namespaces
          .add({ name: 'mycompany', prefix: 'mco' })
          .rel({ name: 'person' })
      )
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            curies: [
              {
                name: 'mco',
                href: `${server.info.uri}/rels/mycompany/{rel}`,
                templated: true,
              },
            ],
            self: { href: `${server.info.uri}/people` },
          },
          _embedded: {
            'mco:person': [],
          },
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should not mess with array responses', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return [{ name: 'Dick' }, { name: 'Jane' }, { name: 'Spot' }];
        },
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result.should.be.an.instanceOf(Array);
        result.should.have.deep.members([
          { name: 'Dick' },
          { name: 'Jane' },
          { name: 'Spot' },
        ]);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should not process internal routes', done => {
    let employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
        isInternal: true,
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
          allowInternals: true,
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.result.should.equal(employee);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support external filtering of requests', done => {
    let employee = { first: 'John', last: 'Doe' };

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        server.plugins.halacious.should.respondTo('filter');

        server.plugins.halacious.filter(request => {
          should.exist(request);
          return false;
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.result.should.equal(employee);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support overriding the url protocol', done => {
    let employee = { first: 'John', last: 'Doe' };

    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { absolute: true, protocol: 'https' },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result._links.self.href.should.match(/https/);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support overriding the hostname', done => {
    let employee = { first: 'John', last: 'Doe' };

    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { absolute: true, host: 'www.cloud.com' },
      })
      .then(() =>
        server.inject({
          method: 'get',
          headers: { host: null },
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result._links.self.href.should.match(/http:\/\/www.cloud.com/);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should support overriding the url builder', done => {
    let employee = { first: 'John', last: 'Doe' };

    let result;

    server.route({
      method: 'get',
      path: '/people',
      config: {
        id: 'person',
        handler() {
          return employee;
        },
      },
    });

    server
      .register({ plugin: halacious, options: { absolute: true } })
      .then(() => {
        server.plugins.halacious.should.respondTo('urlBuilder');

        server.plugins.halacious.urlBuilder((request, path, search) =>
          url.format({
            hostname: 'www.myapp.com',
            port: 12345,
            pathname: path,
            protocol: 'https',
            search,
          })
        );
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        result = JSON.parse(res.payload);
        result._links.self.href.should.match(/https:\/\/www.myapp.com:12345/);
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should not HALify when another media type is preferred by default', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { requireHalJsonAcceptHeader: true },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          firstName: 'Bob',
          lastName: 'Smith',
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          firstName: 'Bob',
          lastName: 'Smith',
        });
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { Accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/hal+json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: {
            self: { href: '/people/100' },
          },
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should HALify when application/hal+json is explicitly asked for', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        },
      },
    });

    server
      .register({
        plugin: halacious,
        options: { requireHalJsonAcceptHeader: true },
      })
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/hal+json');
        result = JSON.parse(res.payload);
        result.should.deep.equal({
          _links: { self: { href: '/people/100' } },
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it('should not replace the original successful response to allow to modify it by other plugins', done => {
    let result;

    server.route({
      method: 'get',
      path: '/people/{id}',
      config: {
        handler() {
          return { firstName: 'Bob', lastName: 'Smith' };
        },
      },
    });

    let callback = sinon.spy();

    let anotherPlugin = {
      name: 'anotherPlugin',
      version: '1.0.0',

      async register(server) {
        server.ext({
          type: 'onPostHandler',
          method(request, h) {
            callback();
            return h.continue;
          },
        });
      },
    };

    let plugins = [
      {
        plugin: halacious,
        options: {
          requireHalJsonAcceptHeader: true,
        },
      },
      {
        plugin: anotherPlugin,
      },
    ];

    server
      .register(plugins)
      .then(() =>
        server.inject({
          method: 'get',
          url: '/people/100',
          headers: { accept: 'application/hal+json' },
        })
      )
      .then(res => {
        res.statusCode.should.equal(200);
        res.headers['content-type'].should.contain('application/hal+json');
        result = JSON.parse(res.payload);

        callback.should.be.called;

        result.should.deep.equal({
          _links: { self: { href: '/people/100' } },
          firstName: 'Bob',
          lastName: 'Smith',
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });
});
