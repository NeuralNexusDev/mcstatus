FROM golang:1.21

WORKDIR /app

ARG GIN_MODE=release

COPY ./icons ./

COPY ./templates ./

COPY go.mod go.sum ./

RUN go mod download

COPY *.go ./

RUN CGO_ENABLED=0 GOOS=linux go build -o /mcstatus

CMD ["/mcstatus"]
