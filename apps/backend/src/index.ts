import { taskSchema } from '@meu-projeto/types';

// Na sua rota...


import Fastify from "fastify"

const fastify = Fastify({ logger: true })

fastify.get("/", async (request, reply) => {
    const validData = taskSchema.parse(request.body);
    return { hello: "world - Backend Fastify rodando!" }
})

const start = async () => {
    try {
        await fastify.listen({ port: 3001 })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
