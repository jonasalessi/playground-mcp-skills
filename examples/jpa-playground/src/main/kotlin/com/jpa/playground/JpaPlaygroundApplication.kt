package com.jpa.playground

import com.jpa.playground.AuthorRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import kotlin.system.exitProcess

@SpringBootApplication
class JpaPlaygroundApplication {

	@Bean
	fun init(
		authorRepository: AuthorRepository,
		bookRepository: BookRepository,
		context: ApplicationContext
	) = CommandLineRunner {
		val author = Author(name = "J.R.R. Tolkien")
		val book1 = Book(title = "The Hobbit", author = author)
		val book2 = Book(title = "The Fellowship of the Ring", author = author)
		
		author.books.add(book1)
		author.books.add(book2)

		authorRepository.save(author)
	}
}

fun main(args: Array<String>) {
	runApplication<JpaPlaygroundApplication>(*args)
}
