# lothric

## Overview

Lothric is an agent implementation that allows you to send files to IPFS in exchange for tokens on the [Torus network](https://torus.network/).

## Setup Instructions

### Prerequisites

- Node.js (v22.8.0)
- pnpm (v9.9.0)
- Docker with docker-compose installed

### Installation

1. Clone the repository:

```bash
$ git clone https://github.com/samueldurantes/lothric.git
$ cd lothric
```

2. Install dependencies:

```bash
$ pnpm install
```

3. Configure environment variables:

```bash
$ cp apps/agent-backend/.env.example apps/agent-backend/.env
$ cp apps/agent-frontend/.env.example apps/agent-frontend/.env
```

After copying the `.env.example` file, you will need to set the environment variables.

4. Create a MongoDB locally using docker-compose:

```bash
$ docker-compose up -d
```

5. Start the development server:

```bash
pnpm dev
```

## API Documentation

You can find the API documentation [here](https://samueldurantes.github.io/lothric/public.html).

## Design Decisions

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://github.com/samueldurantes/lothric/blob/main/LICENSE) file for details.
